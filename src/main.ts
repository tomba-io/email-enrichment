import { log } from 'apify';
import { Finder } from 'tomba';

import { InputError, queryBool, queryInt, queryList, queryString, runActor } from './standby.js';
import type { RunOptions } from './tomba.js';
import {
    callTomba,
    getClient,
    hasPhoneData,
    isBillable,
    normalizeEmail,
    PHONE_CREDITS,
    phoneDataCount,
    runPool,
    unique,
} from './tomba.js';

interface ActorInput extends RunOptions {
    emails?: string[];
    maxResults?: number;
    enrichMobile?: boolean;
    webhookUrl?: string;
}

const SOURCE = 'tomba_email_enrichment';

/** Tomba: 1 search credit, or 6 when phone data is returned (`enrich_mobile=true`). */
const credits = (body: Record<string, unknown>) => 1 + (hasPhoneData(body.data) ? PHONE_CREDITS : 0);

await runActor<ActorInput>({
    title: 'Email Enrichment',
    count: (input) => input.emails?.length ?? 0,
    fromQuery: (query) => ({
        emails: queryList(query, 'email', 'emails'),
        enrichMobile: queryBool(query, 'enrichMobile'),
        webhookUrl: queryString(query, 'webhookUrl'),
        maxResults: queryInt(query, 'maxResults'),
    }),
    run: async (input, { push, isDone, markDone, standby }) => {
        if (!Array.isArray(input.emails) || !input.emails.length) {
            throw new InputError('Input must contain at least one email in "emails".');
        }

        const maxResults = input.maxResults ?? 50;
        const enrichMobile = input.enrichMobile ?? false;
        const webhookUrl = typeof input.webhookUrl === 'string' ? input.webhookUrl.trim() : '';
        if (webhookUrl && !/^https?:\/\//.test(webhookUrl)) {
            throw new InputError('"webhookUrl" must start with http:// or https://.');
        }

        const finder = new Finder(getClient());

        const emails = unique(input.emails.map((email) => (typeof email === 'string' ? normalizeEmail(email) : '')));
        const doneCount = emails.filter((email) => isDone(email)).length;
        const pending = emails.filter((email) => !isDone(email)).slice(0, Math.max(0, maxResults - doneCount));
        if (doneCount > 0) {
            log.info(`Resuming: ${doneCount} emails already processed.`);
        }
        if (!standby) log.info(`Enriching ${pending.length} emails${enrichMobile ? ' (with phone numbers)' : ''}`);

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
                await push({
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
                await push({
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

            markDone(email);
        });
    },
});
