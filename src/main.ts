// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/)
import { Actor } from 'apify';
// Tomba SDK for email enrichment
import { Finder, TombaClient } from 'tomba';

interface ActorInput {
    tombaApiKey: string;
    tombaApiSecret: string;
    emails?: string[];
    maxResults?: number;
}

// Rate limiting: 150 requests per minute
const RATE_LIMIT = 150;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
let requestCount = 0;
let windowStart = Date.now();

async function rateLimitedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    const now = Date.now();

    // Reset counter if window has passed
    if (now - windowStart > RATE_LIMIT_WINDOW) {
        requestCount = 0;
        windowStart = now;
    }

    // Check if we've hit the rate limit
    if (requestCount >= RATE_LIMIT) {
        const waitTime = RATE_LIMIT_WINDOW - (now - windowStart);
        console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
        await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), waitTime);
        });

        // Reset after waiting
        requestCount = 0;
        windowStart = Date.now();
    }

    requestCount++;
    return await requestFn();
}

// The init() call configures the Actor for its environment
await Actor.init();

try {
    // Get input from the Actor
    const input = (await Actor.getInput()) as ActorInput;

    if (!input) {
        throw new Error('No input provided');
    }

    if (!input.tombaApiKey || !input.tombaApiSecret) {
        throw new Error('Tomba API key and secret are required');
    }

    console.log('Starting Tomba Email-Enrichment Actor...');
    console.log(`Processing ${input.emails?.length || 0} emails`);

    // Init Tomba
    const client = new TombaClient();
    const finder = new Finder(client);
    client
        .setKey(input.tombaApiKey) // Your Key
        .setSecret(input.tombaApiSecret); // Your Secret

    const results: Record<string, unknown>[] = [];
    const maxResults = input.maxResults || 50;

    // Process emails
    if (input.emails && input.emails.length > 0) {
        console.log(`Processing ${input.emails.length} emails...`);

        for (const email of input.emails) {
            if (results.length >= maxResults) break;

            try {
                console.log(`Enriching email: ${email}`);

                // Use Tomba's email enrichment method with rate limiting
                const result = finder.emailEnrichment(email);

                const tombaResult = await rateLimitedRequest(async () => await result);

                if (tombaResult && tombaResult.data && tombaResult.data.first_name) {
                    const enrichmentData = {
                        ...tombaResult.data,
                        email,
                        source: 'tomba_email_enrichment',
                    };

                    results.push(enrichmentData);
                    console.log(
                        `Found enrichment data for: ${email} - ${tombaResult.data.first_name || 'Unknown Person'}`,
                    );
                } else {
                    // Add empty result if no data found
                    results.push({
                        email,
                        error: 'No enrichment data found',
                        source: 'tomba_email_enrichment',
                    });
                }
            } catch (error) {
                console.log(`Error processing email ${email}:`, error);

                // Add error entry to results for transparency
                results.push({
                    email,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    source: 'tomba_email_enrichment',
                });
            }
        }
    }

    if (results.length > 0) {
        await Actor.pushData(results);
    }

    // Log summary
    console.log('=== SUMMARY ===');
    console.log(`Total emails processed: ${input.emails?.length || 0}`);
    console.log(`Successful enrichments: ${results.filter((r) => !('error' in r)).length}`);
    console.log(`Failed enrichments: ${results.filter((r) => 'error' in r).length}`);
} catch (error) {
    console.error('Actor failed:', error);
    throw error;
}

// Gracefully exit the Actor process
await Actor.exit();
