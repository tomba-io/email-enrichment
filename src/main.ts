import { Actor, log } from 'apify';
import { Finder } from 'tomba';

import type { RunOptions } from './tomba.js';
import {
    callTomba,
    hasPhoneData,
    isBillable,
    logSummary,
    normalizeEmail,
    PHONE_CREDITS,
    phoneDataCount,
    runPool,
    setupTomba,
    unique,
    useRunState,
} from './tomba.js';

interface ActorInput extends RunOptions {
    emails: string[];
    maxResults?: number;
    enrichMobile?: boolean;
    webhookUrl?: string;
}

const SOURCE = 'tomba_email_enrichment';

await Actor.init();

const input = await Actor.getInput<ActorInput>();
if (!input?.emails?.length) {
    await Actor.fail('Input must contain at least one email in "emails".');
}

const { emails: rawEmails, maxResults = 50, enrichMobile = false, webhookUrl: rawWebhookUrl, ...runOptions } = input!;
const webhookUrl = typeof rawWebhookUrl === 'string' ? rawWebhookUrl.trim() : '';
if (webhookUrl && !/^https?:\/\//.test(webhookUrl)) {
    await Actor.fail('"webhookUrl" must start with http:// or https://.');
}

const client = await setupTomba(runOptions);
const finder = new Finder(client);
const state = await useRunState();

const emails = unique(rawEmails.map((email) => (typeof email === 'string' ? normalizeEmail(email) : '')));
const doneCount = emails.filter((email) => state.done[email]).length;
const pending = emails.filter((email) => !state.done[email]).slice(0, Math.max(0, maxResults - doneCount));
if (doneCount > 0) {
    log.info(`Resuming: ${doneCount} emails already processed.`);
}

const startedAt = Date.now();
log.info(`Enriching ${pending.length} emails${enrichMobile ? ' (with phone numbers)' : ''}`);

/** Tomba: 1 search credit, or 6 when phone data is returned (`enrich_mobile=true`). */
const credits = (body: Record<string, unknown>) => 1 + (hasPhoneData(body.data) ? PHONE_CREDITS : 0);

await runPool(pending, async (email) => {
    // Optional parameters are only sent (and only part of the cache key) when set.
    const params: Record<string, unknown> = { email };
    if (enrichMobile) params.enrich_mobile = true;
    if (webhookUrl) params.webhook_url = webhookUrl;

    const res = await callTomba(
        'enrich',
        params,
        async () => finder.emailEnrichment(email, enrichMobile || undefined, webhookUrl || undefined),
        undefined,
        credits,
    );
    if (res.skipped) return;

    const chargedCredits = res.chargedCount ?? 0;
    if (isBillable(res.body)) {
        const data = res.data as Record<string, unknown>;
        const phoneNumbers = phoneDataCount(data);
        await Actor.pushData({
            ...data,
            email,
            source: SOURCE,
            phoneNumbers,
            charged: res.charged,
            chargedCredits,
            cached: res.cached,
        });
        const name = data.full_name ?? data.first_name ?? 'Unknown Person';
        const phones = phoneNumbers ? `, ${phoneNumbers} phone numbers` : '';
        log.info(`${email}: ${String(name)}${phones}${res.cached ? ' (cached)' : ''}`);
    } else {
        await Actor.pushData({
            email,
            source: SOURCE,
            phoneNumbers: 0,
            charged: res.charged,
            chargedCredits,
            cached: res.cached,
            error: res.error ?? 'No enrichment data found',
        });
        log.info(`${email}: ${res.error ?? 'no enrichment data found'}`);
    }

    state.done[email] = true;
});

logSummary('Email Enrichment', emails.length, startedAt);

await Actor.exit();
