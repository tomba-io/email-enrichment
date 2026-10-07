# Tomba Email Enrichment

[![Price](https://img.shields.io/badge/Price-%243.12%20per%201K%20emails-brightgreen)](#pricing)
[![No signup](https://img.shields.io/badge/Tomba%20account-not%20needed-blue)](#quick-start)
[![No rate limit](https://img.shields.io/badge/Rate%20limit-none-brightgreen)](#built-for-big-lists)

**Turn a bare email address into a full contact profile.** Paste a list of emails and get the person's name, job title, company, website, country, LinkedIn and Twitter, plus a confidence score, verification status and the public sources the data came from. Turn on **Find phone numbers** to get their phone numbers too. Ready to export to your CRM.

No Tomba account. No API key. No subscription. **You pay $0.00312 per email, and only when Tomba returns an answer.**

## Why teams choose this Actor

- **Start in 30 seconds**: Open the Actor, paste your emails, click Start. Nothing to sign up for
- **Pay only for answers**: Errors, invalid emails and empty results are free
- **$3.12 per 1,000 emails**: No monthly plan, no credits that expire, no minimum spend
- **Phone numbers on demand**: Turn on `enrichMobile` to get mobile and direct numbers, and pay for them only when we find one
- **Built for big lists**: No rate limit. Thousands of emails run in parallel
- **Never pay twice**: Emails you enriched in the last 24 hours come back from cache for free
- **Clean input, clean output**: Emails are trimmed, lowercased and deduplicated automatically
- **Export anywhere**: Download as CSV, Excel or JSON, or send results straight to your CRM with Apify integrations

## Promises we actually keep

- **Less than 5% bounce rate** — Every email is verified in real time before you're charged.

## What you can do with it

| Goal                      | How email enrichment helps                                                |
| ------------------------- | ------------------------------------------------------------------------- |
| **Complete your CRM**     | Fill in names, job titles and companies for contacts that only have email |
| **Qualify inbound leads** | See who signed up and where they work before you reply                    |
| **Personalize outreach**  | Address people by name and reference their role and company               |
| **Route leads faster**    | Send leads to the right rep based on company, position or country         |
| **Clean your lists**      | Check verification status and score before you send a campaign            |

## Quick start

1. Click **Try for free**
2. Paste your email addresses into **Email Addresses** (for example `john@stripe.com`)
3. Click **Start**, then download your results as CSV, Excel or JSON

That's it. No Tomba account or API key is needed.

## Input

| Field            | Required | Default | Description                                                                                                           |
| ---------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| `emails`         | Yes      |         | Email addresses to enrich (up to 1,000 per run)                                                                       |
| `maxResults`     | No       | `50`    | Maximum number of emails to enrich in this run (up to 1,000)                                                          |
| `enrichMobile`   | No       | `false` | Also find the person's phone numbers. A result with phone data costs 6 credits instead of 1 (see [Pricing](#pricing)) |
| `webhookUrl`     | No       |         | URL (`http://` or `https://`) that Tomba notifies when a result is ready                                              |
| `maxConcurrency` | No       | `10`    | How many emails to process at the same time (1–50)                                                                    |
| `maxRetries`     | No       | `3`     | How many times to retry a temporary failure (0–10)                                                                    |
| `useCache`       | No       | `true`  | Reuse results from your previous runs for free                                                                        |
| `cacheTtlHours`  | No       | `24`    | How long cached results stay valid (`0` turns the cache off)                                                          |

```json
{
    "emails": ["john@stripe.com", "info@tomba.io"],
    "maxResults": 500,
    "enrichMobile": true
}
```

## Output

You get one row per email:

```json
{
    "email": "john.doe@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "gender": "male",
    "company": "Example Corp",
    "position": "Software Engineer",
    "country": "US",
    "website_url": "example.com",
    "twitter": "https://twitter.com/johndoe",
    "linkedin": "https://linkedin.com/in/johndoe",
    "score": 95,
    "accept_all": false,
    "verification": {
        "date": "2025-10-17T00:00:00+02:00",
        "status": "valid"
    },
    "sources": [
        {
            "uri": "https://example.com/team",
            "website_url": "example.com",
            "extracted_on": "2024-09-17T11:26:56+02:00",
            "last_seen_on": "2025-09-06T04:51:06+02:00",
            "still_on_page": true
        }
    ],
    "phone_data": [{ "number": "+14155550123", "type": "mobile" }],
    "source": "tomba_email_enrichment",
    "phoneNumbers": 1,
    "charged": true,
    "chargedCredits": 6,
    "cached": false
}
```

| Field                                  | Description                                             |
| -------------------------------------- | ------------------------------------------------------- |
| `email`                                | The email you submitted                                 |
| `first_name`, `last_name`, `full_name` | Name of the person behind the email                     |
| `gender`                               | Gender, when known                                      |
| `company`                              | Company the person works for                            |
| `position`                             | Job title                                               |
| `country`                              | Country code                                            |
| `website_url`                          | Company website                                         |
| `twitter`, `linkedin`                  | Social profile links, when available                    |
| `phone_number`                         | Phone number, when available                            |
| `phone_data`                           | The person's phone numbers (only with `enrichMobile`)   |
| `phoneNumbers`                         | How many phone numbers were returned                    |
| `score`                                | Confidence score from 0 to 100                          |
| `accept_all`                           | `true` if the company's mail server accepts any address |
| `verification`                         | Verification `status` (for example `valid`) and `date`  |
| `sources`                              | Public web pages where the email was found, with dates  |
| `source`                               | Always `tomba_email_enrichment`                         |
| `charged`                              | `true` if this lookup was billed                        |
| `chargedCredits`                       | Credits billed for this row (0, 1 or 6)                 |
| `cached`                               | `true` if this result came from the cache (free)        |
| `error`                                | Why no data was returned, if applicable                 |

Fields Tomba doesn't know for a person are `null`. The dataset has four ready-made views: **Overview**, **Detailed View**, **Successful Enrichments** and **Enrichment Errors**.

## Pricing

**$0.00312 per credit.** Enriching an email costs 1 credit ($3.12 per 1,000 emails). No subscription and no Tomba account needed.

| Result                                                      | Credits | Price    |
| ----------------------------------------------------------- | ------- | -------- |
| Email enrichment                                            | 1       | $0.00312 |
| Enrichment with phone data (`enrichMobile` on, phone found) | 6       | $0.01872 |
| `enrichMobile` on, but no phone number found                | 1       | $0.00312 |

Phone data adds $0.0156 (5 credits) to a result, and only when `enrichMobile` is on and at least one phone number is returned.

You are only charged when Tomba returns an answer:

| What happens                                                      | Charged |
| ----------------------------------------------------------------- | ------- |
| Profile data found for the email                                  | Yes     |
| Tomba checked the email but has no person details (fields `null`) | Yes     |
| No result returned at all                                         | No      |
| Invalid email or any other error                                  | No      |
| Temporary failure (it is retried automatically)                   | No      |
| Result served from the cache                                      | No      |

Every row shows `charged`, `chargedCredits` and `cached`, so you always know what you paid for. To cap your spend, set **Maximum cost per run** in the run options: the Actor stops cleanly when the limit is reached.

## Built for big lists

- **No rate limit**: up to 50 emails are processed at the same time
- **Automatic retries**: temporary failures are retried for you, and never billed
- **Resumable**: if a run is interrupted, it continues where it stopped without charging you again
- **Cache**: repeat lookups within 24 hours are free

## Integrations

Run it on a schedule, call it from the Apify API, or connect it to Zapier, Make, Google Sheets, HubSpot, Slack and hundreds of other apps with [Apify integrations](https://docs.apify.com/platform/integrations). Webhooks let you trigger your own workflow as soon as a run finishes.

## FAQ

**Do I need a Tomba account or API key?**
No. Everything is built in. You only pay the per-email price on Apify.

**How much does it cost?**
$0.00312 per email with an answer ($3.12 per 1,000), or $0.01872 when you turn on `enrichMobile` and we return phone numbers. Errors, empty results and cached lookups are free.

**Can I get phone numbers too?**
Yes. Turn on **Find phone numbers** (`enrichMobile`). Numbers come back in `phone_data`, and `phoneNumbers` tells you how many. A result with phone data costs 6 credits ($0.01872) instead of 1; if no phone number is found you pay the normal 1 credit. Phone lookups are off by default.

**How many emails can I enrich in one run?**
Up to 1,000 per run, processed in parallel. There is no rate limit. Set **Maximum Results** to the number of emails you want to enrich (default 50).

**Can I enrich Gmail, Yahoo or other personal addresses?**
Enrichment works best with business email addresses. Personal addresses are rarely linked to a company or job title, so expect fewer details.

**Why are some fields empty?**
Tomba only returns what it finds in public sources. If a person has little public presence, some fields come back `null`.

**What if my run is interrupted?**
It picks up where it stopped. Emails already processed are not charged again.

**Where does the data come from?**
From publicly available sources such as company websites and professional profiles. Each result lists its `sources` with the dates they were seen.

**How do I limit what I spend?**
Set **Maximum cost per run** before you start. The Actor stops as soon as the limit is reached.

## Support

Questions or feedback? We're happy to help:

- **Email**: support@tomba.io
- **Live chat**: on [tomba.io](https://tomba.io) during business hours
- **Issues**: use the **Issues** tab on this Actor's page

## About Tomba

Founded in 2020, [Tomba](https://tomba.io) is a B2B data platform for finding, verifying and enriching business contacts. Our Email Finder, Domain Search and Email Verifier help sales and marketing teams reach the right people.

![Tomba Logo](https://tomba.io/logo.png)
