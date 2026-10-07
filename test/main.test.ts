// End-to-end tests: run the Actor against a mock Tomba API.
import assert from 'node:assert/strict';
import { after, afterEach, describe, it } from 'node:test';

import type { MockHandler, MockServer } from './helpers.js';
import { removeStorage, runActor, startMockTomba, startStandbyActor, totalCharges } from './helpers.js';

function person(email: string): Record<string, unknown> {
    return {
        email,
        first_name: 'Patrick',
        last_name: 'Collison',
        full_name: 'Patrick Collison',
        gender: 'male',
        phone_number: false,
        type: 'personal',
        country: 'US',
        position: 'CEO',
        twitter: 'https://twitter.com/patrickc',
        linkedin: 'https://www.linkedin.com/in/patrickcollison',
        accept_all: false,
        website_url: 'stripe.com',
        company: 'Stripe',
        score: 99,
        verification: { date: '2026-09-01T00:00:00+02:00', status: 'valid' },
        sources: [
            {
                uri: 'https://stripe.com/about',
                website_url: 'stripe.com',
                extracted_on: '2024-09-17T11:26:56+02:00',
                last_seen_on: '2026-09-06T04:51:06+02:00',
                still_on_page: true,
            },
        ],
    };
}

/** Negative answer: Tomba knows nothing about the person but still returns a data object. */
const NEGATIVE = {
    email: null,
    first_name: null,
    last_name: null,
    full_name: null,
    company: null,
    score: 0,
    verification: { date: null, status: null },
    sources: [],
};

/** Phone fixtures returned with `enrich_mobile=true`: two@ has two numbers, nophone@ none, everyone else one. */
function phonesFor(email: string): Record<string, unknown>[] {
    if (email.startsWith('nophone@')) return [];
    if (email.startsWith('two@')) {
        return [
            { number: '+14155550123', type: 'mobile' },
            { number: '+14155550199', type: 'work' },
        ];
    }
    return [{ number: '+14155550123', type: 'mobile' }];
}

/** Default Tomba behaviour keyed by the requested email; `phone_data` only with `enrich_mobile=true`. */
const tomba: MockHandler = (req) => {
    assert.equal(req.method, 'GET');
    assert.equal(req.path, '/enrich');
    const { email, enrich_mobile: enrichMobile } = req.query;
    const phones = enrichMobile === 'true' ? { phone_data: phonesFor(email) } : {};
    if (email === 'empty@example.com') return { body: { data: null } };
    if (email === 'emptyobj@example.com') return { body: { data: {} } };
    if (email === 'unknown@example.com') return { body: { data: { ...NEGATIVE, ...phones } } };
    if (email === 'invalid@example.com') return { status: 422, body: { errors: { message: 'Invalid email' } } };
    if (email === 'html@example.com') return { raw: '<html>Bad gateway</html>' };
    return { body: { data: { ...person(email), ...phones } } };
};

const servers: MockServer[] = [];
const dirs: string[] = [];

async function mock(handler: MockHandler = tomba): Promise<MockServer> {
    const server = await startMockTomba(handler);
    servers.push(server);
    return server;
}

async function run(...args: Parameters<typeof runActor>) {
    const result = await runActor(...args);
    dirs.push(result.storageDir);
    return result;
}

afterEach(async () => {
    await Promise.all(servers.splice(0).map(async (s) => s.close()));
});

after(async () => {
    await Promise.all(dirs.map(removeStorage));
});

describe('email-enrichment', () => {
    it('returns the enriched profile and charges one event per billable email', async () => {
        const server = await mock();
        const result = await run({
            input: { emails: ['patrick@stripe.com', 'empty@example.com', 'emptyobj@example.com'] },
            endpoint: server.url,
        });

        assert.equal(result.code, 0, result.output);
        assert.equal(result.items.length, 3);
        const found = result.items.find((i) => i.email === 'patrick@stripe.com');
        assert.deepEqual(found, {
            ...person('patrick@stripe.com'),
            source: 'tomba_email_enrichment',
            phoneNumbers: 0,
            charged: true,
            chargedCredits: 1,
            cached: false,
        });

        for (const email of ['empty@example.com', 'emptyobj@example.com']) {
            const item = result.items.find((i) => i.email === email);
            assert.deepEqual(item, {
                email,
                source: 'tomba_email_enrichment',
                phoneNumbers: 0,
                charged: false,
                chargedCredits: 0,
                cached: false,
                error: 'No enrichment data found',
            });
        }

        assert.deepEqual(result.chargeCounts, { 'tomba-request': 1 });
    });

    it('charges a negative answer and keeps the input email', async () => {
        const server = await mock();
        const result = await run({ input: { emails: ['unknown@example.com'] }, endpoint: server.url });

        assert.equal(result.code, 0, result.output);
        assert.equal(result.items.length, 1);
        assert.equal(result.items[0].email, 'unknown@example.com');
        assert.equal(result.items[0].full_name, null);
        assert.equal(result.items[0].charged, true);
        assert.equal(result.items[0].error, undefined);
        assert.deepEqual(result.chargeCounts, { 'tomba-request': 1 });
    });

    it('sends the built-in credentials to Tomba', async () => {
        const server = await mock();
        await run({ input: { emails: ['patrick@stripe.com'] }, endpoint: server.url });
        assert.equal(server.requests.length, 1);
        assert.equal(server.requests[0].headers['x-tomba-key'], 'ta_test_key');
        assert.equal(server.requests[0].headers['x-tomba-secret'], 'ts_test_secret');
    });

    it('normalizes and deduplicates emails', async () => {
        const server = await mock();
        const result = await run({
            input: { emails: ['  Patrick@Stripe.com ', 'patrick@stripe.com', 'PATRICK@STRIPE.COM', ''] },
            endpoint: server.url,
        });
        assert.deepEqual(
            server.requests.map((r) => r.query.email),
            ['patrick@stripe.com'],
        );
        assert.equal(result.items.length, 1);
        assert.equal(result.items[0].email, 'patrick@stripe.com');
    });

    it('does not charge Tomba error statuses and does not retry them', async () => {
        const server = await mock();
        const result = await run({ input: { emails: ['invalid@example.com'] }, endpoint: server.url });
        assert.equal(result.code, 0, result.output);
        assert.equal(server.requests.length, 1);
        assert.equal(result.items[0].charged, false);
        assert.match(String(result.items[0].error), /422: Invalid email/);
        assert.equal(totalCharges(result), 0);
    });

    it('does not charge a non-JSON body', async () => {
        const server = await mock();
        const result = await run({ input: { emails: ['html@example.com'] }, endpoint: server.url });
        assert.equal(result.items[0].charged, false);
        assert.match(String(result.items[0].error), /Invalid response/);
        assert.equal(totalCharges(result), 0);
    });

    it('retries 429 and 5xx responses, then charges the success once', async () => {
        let calls = 0;
        const server = await mock(async (req) => {
            calls++;
            if (calls === 1)
                return {
                    status: 429,
                    body: { errors: { message: 'Too many requests' } },
                    headers: { 'retry-after': '1' },
                };
            if (calls === 2) return { status: 503, body: {} };
            return tomba(req);
        });
        const result = await run({ input: { emails: ['patrick@stripe.com'], maxRetries: 3 }, endpoint: server.url });
        assert.equal(server.requests.length, 3);
        assert.equal(result.items.length, 1);
        assert.equal(result.items[0].charged, true);
        assert.deepEqual(result.chargeCounts, { 'tomba-request': 1 });
    });

    it('serves repeated runs from the cache for free', async () => {
        const server = await mock();
        const first = await run({ input: { emails: ['patrick@stripe.com'] }, endpoint: server.url });
        const second = await run({
            input: { emails: ['patrick@stripe.com'] },
            endpoint: server.url,
            storageDir: first.storageDir,
        });

        assert.equal(server.requests.length, 1);
        assert.equal(second.items.length, 1);
        assert.equal(second.items[0].full_name, 'Patrick Collison');
        assert.equal(second.items[0].cached, true);
        assert.equal(second.items[0].charged, false);
        assert.equal(totalCharges(second), 0);
    });

    it('calls Tomba again when the cache is disabled', async () => {
        const server = await mock();
        const first = await run({ input: { emails: ['patrick@stripe.com'], useCache: false }, endpoint: server.url });
        await run({
            input: { emails: ['patrick@stripe.com'], useCache: false },
            endpoint: server.url,
            storageDir: first.storageDir,
        });
        assert.equal(server.requests.length, 2);
    });

    it('stops at the max charge limit and resumes without reprocessing', async () => {
        const server = await mock();
        const emails = ['a@a.com', 'b@b.com', 'c@c.com', 'd@d.com', 'e@e.com'];
        const input = { emails, maxConcurrency: 1, useCache: false, maxResults: 100 };

        // Locally every event costs $1, so a $2 budget allows two billable requests.
        const first = await run({ input, endpoint: server.url, maxTotalChargeUsd: 2 });
        assert.equal(first.code, 0, first.output);
        assert.equal(totalCharges(first), 2);
        assert.equal(server.requests.length, 2);
        assert.equal(first.items.length, 2);

        const second = await run({ input, endpoint: server.url, storageDir: first.storageDir, keepStorage: true });
        assert.equal(second.code, 0, second.output);
        assert.deepEqual(
            server.requests.map((r) => r.query.email),
            emails,
        );
        assert.equal(second.items.length, 5);
    });

    it('respects maxResults', async () => {
        const server = await mock();
        const result = await run({
            input: { emails: ['a@a.com', 'b@b.com', 'c@c.com'], maxResults: 2, maxConcurrency: 1 },
            endpoint: server.url,
        });
        assert.equal(result.items.length, 2);
        assert.equal(server.requests.length, 2);
    });

    it('runs requests in parallel', async () => {
        let active = 0;
        let peak = 0;
        const server = await mock(async (req) => {
            active++;
            peak = Math.max(peak, active);
            await new Promise((r) => {
                setTimeout(r, 100);
            });
            active--;
            return tomba(req);
        });
        const emails = Array.from({ length: 8 }, (_, i) => `person${i}@example.org`);
        await run({ input: { emails, maxConcurrency: 4 }, endpoint: server.url });
        assert.equal(server.requests.length, 8);
        assert.ok(peak > 1 && peak <= 4, `peak concurrency ${peak}`);
    });

    it('fails without Tomba credentials and never calls the API', async () => {
        const server = await mock();
        const result = await run({
            input: { emails: ['patrick@stripe.com'] },
            endpoint: server.url,
            withCredentials: false,
        });
        assert.notEqual(result.code, 0);
        assert.match(result.output, /misconfigured/);
        assert.doesNotMatch(result.output, /ta_test_key|ts_test_secret/);
        assert.equal(server.requests.length, 0);
    });

    it('sends enrich_mobile and webhook_url only when they are set', async () => {
        const server = await mock();
        await run({ input: { emails: ['patrick@stripe.com'], enrichMobile: false }, endpoint: server.url });
        await run({
            input: {
                emails: ['john@stripe.com'],
                enrichMobile: true,
                webhookUrl: 'https://hooks.example.com/tomba',
            },
            endpoint: server.url,
        });
        assert.deepEqual(
            server.requests.map((r) => r.query),
            [
                { email: 'patrick@stripe.com' },
                { email: 'john@stripe.com', enrich_mobile: 'true', webhook_url: 'https://hooks.example.com/tomba' },
            ],
        );
    });

    it('fails on a webhook URL that is not http(s) and never calls the API', async () => {
        const server = await mock();
        const result = await run({
            input: { emails: ['patrick@stripe.com'], webhookUrl: 'ftp://hooks.example.com' },
            endpoint: server.url,
        });
        assert.notEqual(result.code, 0);
        assert.equal(server.requests.length, 0);
    });

    it('charges 1 credit without enrichMobile and returns no phone data', async () => {
        const server = await mock();
        const result = await run({ input: { emails: ['two@stripe.com'] }, endpoint: server.url });
        assert.equal(result.items[0].phone_data, undefined);
        assert.equal(result.items[0].phoneNumbers, 0);
        assert.equal(result.items[0].chargedCredits, 1);
        assert.deepEqual(result.chargeCounts, { 'tomba-request': 1 });
    });

    it('charges 6 credits per result with phone data, whatever the number of phones', async () => {
        const server = await mock();
        const result = await run({
            input: { emails: ['patrick@stripe.com', 'two@stripe.com'], enrichMobile: true },
            endpoint: server.url,
        });
        assert.equal(result.code, 0, result.output);
        const one = result.items.find((i) => i.email === 'patrick@stripe.com');
        const two = result.items.find((i) => i.email === 'two@stripe.com');
        assert.deepEqual(one?.phone_data, [{ number: '+14155550123', type: 'mobile' }]);
        assert.equal(one?.phoneNumbers, 1);
        assert.equal(one?.chargedCredits, 6);
        assert.equal(one?.charged, true);
        assert.equal(two?.phoneNumbers, 2);
        assert.equal(two?.chargedCredits, 6);
        assert.deepEqual(result.chargeCounts, { 'tomba-request': 12 });
    });

    it('charges 1 credit with enrichMobile when no phone number is found', async () => {
        const server = await mock();
        const result = await run({
            input: { emails: ['nophone@stripe.com'], enrichMobile: true },
            endpoint: server.url,
        });
        assert.deepEqual(result.items[0].phone_data, []);
        assert.equal(result.items[0].phoneNumbers, 0);
        assert.equal(result.items[0].chargedCredits, 1);
        assert.deepEqual(result.chargeCounts, { 'tomba-request': 1 });
    });

    it('serves phone data from the cache for free', async () => {
        const server = await mock();
        const input = { emails: ['two@stripe.com'], enrichMobile: true };
        const first = await run({ input, endpoint: server.url });
        assert.equal(totalCharges(first), 6);
        const second = await run({ input, endpoint: server.url, storageDir: first.storageDir });
        assert.equal(server.requests.length, 1);
        assert.equal(second.items[0].cached, true);
        assert.equal(second.items[0].charged, false);
        assert.equal(second.items[0].chargedCredits, 0);
        assert.equal(second.items[0].phoneNumbers, 2);
        assert.equal(totalCharges(second), 0);
    });

    it('does not reuse a cached result without phone data when enrichMobile is turned on', async () => {
        const server = await mock();
        const first = await run({ input: { emails: ['patrick@stripe.com'] }, endpoint: server.url });
        const second = await run({
            input: { emails: ['patrick@stripe.com'], enrichMobile: true },
            endpoint: server.url,
            storageDir: first.storageDir,
        });
        assert.equal(server.requests.length, 2);
        assert.equal(second.items[0].phoneNumbers, 1);
        assert.equal(totalCharges(second), 6);
    });

    it('fails on empty input', async () => {
        const server = await mock();
        const result = await run({ input: { emails: [] }, endpoint: server.url });
        assert.notEqual(result.code, 0);
        assert.equal(server.requests.length, 0);
    });

    it('skips blank entries without calling Tomba', async () => {
        const server = await mock();
        const result = await run({ input: { emails: ['', '   '] }, endpoint: server.url });
        assert.equal(result.code, 0, result.output);
        assert.equal(server.requests.length, 0);
        assert.equal(result.items.length, 0);
        assert.equal(totalCharges(result), 0);
    });
});

describe('email-enrichment standby (real-time API)', () => {
    it('answers the readiness probe and a bare GET with usage info', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        try {
            const probe = await actor.call('/', { headers: { 'x-apify-container-server-readiness-probe': '1' } });
            assert.equal(probe.status, 200);
            const usage = await actor.call('/');
            assert.equal(usage.status, 200);
            assert.match(String(usage.body.usage), /GET/);
            assert.equal(server.requests.length, 0);
        } finally {
            await actor.stop();
        }
    });

    it('enriches emails from GET query parameters and charges per credit', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        let stopped;
        try {
            const res = await actor.call('/?email=Patrick@Stripe.com&email=empty@example.com');
            assert.equal(res.status, 200);
            const items = res.body.items as Record<string, unknown>[];
            assert.deepEqual(
                items.find((i) => i.email === 'patrick@stripe.com'),
                {
                    ...person('patrick@stripe.com'),
                    source: 'tomba_email_enrichment',
                    phoneNumbers: 0,
                    charged: true,
                    chargedCredits: 1,
                    cached: false,
                },
            );
            assert.equal(items.find((i) => i.email === 'empty@example.com')?.error, 'No enrichment data found');

            const phones = await actor.call('/?emails=two@stripe.com&enrichMobile=true');
            const [item] = phones.body.items as Record<string, unknown>[];
            assert.equal(item.phoneNumbers, 2);
            assert.equal(item.chargedCredits, 6);
            assert.equal(server.requests.at(-1)?.query.enrich_mobile, 'true');
        } finally {
            stopped = await actor.stop();
        }
        assert.deepEqual(stopped.chargeCounts, { 'tomba-request': 7 });
    });

    it('accepts a POST with the same JSON input as a normal run', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        try {
            const res = await actor.call('/', {
                body: { emails: ['a@stripe.com', 'b@stripe.com', 'c@stripe.com'], maxResults: 2 },
            });
            assert.equal(res.status, 200);
            assert.equal((res.body.items as unknown[]).length, 2);
            assert.equal(server.requests.length, 2);
        } finally {
            await actor.stop();
        }
    });

    it('serves repeated requests from the cache for free', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        let stopped;
        try {
            await actor.call('/?email=patrick@stripe.com');
            const second = await actor.call('/?email=patrick@stripe.com');
            assert.ok((second.body.items as Record<string, unknown>[]).every((i) => i.cached === true));
            assert.equal(server.requests.length, 1);
        } finally {
            stopped = await actor.stop();
        }
        assert.deepEqual(stopped.chargeCounts, { 'tomba-request': 1 });
    });

    it('keeps serving after a request hits maxResults', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        try {
            const first = await actor.call('/?email=a@stripe.com,b@stripe.com&maxResults=1');
            assert.equal((first.body.items as unknown[]).length, 1);
            const second = await actor.call('/?email=c@stripe.com&email=d@stripe.com');
            assert.equal((second.body.items as unknown[]).length, 2);
        } finally {
            await actor.stop();
        }
    });

    it('rejects invalid input with 400 and unknown paths with 404', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        try {
            assert.equal((await actor.call('/', { body: {} })).status, 400);
            assert.equal((await actor.call('/', { body: 'not json' })).status, 400);
            assert.equal((await actor.call('/?maxResults=abc&email=a@stripe.com')).status, 400);
            assert.equal((await actor.call('/?enrichMobile=maybe&email=a@stripe.com')).status, 400);
            assert.equal((await actor.call('/?email=a@stripe.com&webhookUrl=ftp://x')).status, 400);
            assert.equal((await actor.call('/nope')).status, 404);
            assert.equal((await actor.call('/', { method: 'DELETE' })).status, 405);
            assert.equal(server.requests.length, 0);
        } finally {
            await actor.stop();
        }
    });

    it('returns 402 once the max charge limit is reached', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url, maxTotalChargeUsd: 1 });
        try {
            const first = await actor.call('/?email=a@stripe.com');
            assert.equal(first.status, 200);
            const second = await actor.call('/?email=b@stripe.com');
            assert.equal(second.status, 402);
            assert.equal(server.requests.length, 1);
        } finally {
            await actor.stop();
        }
    });
});
