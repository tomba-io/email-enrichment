# Tomba Email Enrichment Actor

[![Actor](https://img.shields.io/badge/Apify-Actor-blue)](https://apify.com/actors)
[![Tomba API](https://img.shields.io/badge/Tomba-API-green)](https://tomba.io)
[![Rate Limit](https://img.shields.io/badge/Rate%20Limit-300%2Fmin-orange)](https://tomba.io/api)

A powerful Apify Actor that enriches email addresses with comprehensive professional and personal data using the **Tomba Email Enrichment API**. Perfect for lead enrichment, contact verification, and building detailed contact profiles from email addresses.

## Key Features

- **Email Enrichment**: Extract detailed information from email addresses
- **Professional Data**: Company, position, and professional details
- **Personal Information**: Names, social profiles, and contact details
- **Email Verification**: Validate email addresses with confidence scores
- **Social Profiles**: Twitter, LinkedIn, and other social media links
- **Bulk Processing**: Process multiple emails efficiently with rate limiting
- **Rate Limited**: Respects Tomba's 300 requests per minute limit
- **Rich Data Output**: Comprehensive contact profiles with metadata
- **Error Handling**: Graceful handling of invalid or unverified emails

## How it works

The Actor leverages Tomba's powerful Email Enrichment API to extract comprehensive contact information:

### Process Flow

1. **Authentication**: Connects to Tomba API using your credentials
2. **Input Processing**: Accepts array of email addresses to enrich
3. **Email Enrichment**: Uses Tomba's `emailEnrichment` method for each email
4. **Data Validation**: Processes and validates contact information
5. **Rate Limiting**: Automatically handles 300 requests/minute limit
6. **Data Storage**: Saves results to Apify dataset

### What You Get

For each enriched email, you'll receive:

- **Personal Info**: First name, last name, full name
- **Email Details**: Verification status with confidence score
- **Professional**: Company, position, website URL
- **Location**: Country information (when available)
- **Contact Info**: Phone numbers (when available)
- **Social Media**: Twitter, LinkedIn profiles
- **Source Tracking**: Multiple sources where information was found
- **Verification**: Email validation status and metadata

## Quick Start

### Prerequisites

1. **Tomba Account**: Sign up at [Tomba.io](https://app.tomba.io/api) to get your API credentials

### Getting Your API Keys

1. Visit [Tomba API Dashboard](https://app.tomba.io/api)
2. Copy your **API Key** (starts with `ta_`)
3. Copy your **Secret Key** (starts with `ts_`)

## Input Configuration

### Required Parameters

| Parameter        | Type     | Description                        |
| ---------------- | -------- | ---------------------------------- |
| `tombaApiKey`    | `string` | Your Tomba API key (ta_xxxx)       |
| `tombaApiSecret` | `string` | Your Tomba secret key (ts_xxxx)    |
| `emails`         | `array`  | Array of email addresses to enrich |

### Optional Parameters

| Parameter    | Type     | Default | Description                         |
| ------------ | -------- | ------- | ----------------------------------- |
| `maxResults` | `number` | `50`    | Maximum number of results to return |

### Example Input

```json
{
    "tombaApiKey": "ta_xxxxxxxxxxxxxxxxxxxx",
    "tombaApiSecret": "ts_xxxxxxxxxxxxxxxxxxxx",
    "emails": ["john.doe@example.com", "jane.smith@company.com", "contact@startup.io"],
    "maxResults": 100
}
```

### Best Practices

- **Email Quality**: Use valid, properly formatted email addresses
- **Rate Limits**: The Actor automatically handles Tomba's 300 requests/minute limit
- **Batch Size**: Process 10-50 emails at a time for optimal performance
- **Data Privacy**: Ensure compliance with data protection regulations

## Output Data Structure

The Actor returns detailed contact information for each enriched email:

```json
{
    "email": "john.doe@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "company": "Example Corp",
    "position": "Software Engineer",
    "country": "US",
    "gender": "male",
    "website_url": "example.com",
    "twitter": "https://twitter.com/johndoe",
    "linkedin": "https://linkedin.com/in/johndoe",
    "phone_number": "+1234567890",
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
    "source": "tomba_email_enrichment"
}
```

### Data Fields Explained

- **Email Verification**: `verification.status` shows email validity
- **Confidence Score**: `score` (0-100) indicates data reliability
- **Accept All**: `accept_all` indicates if domain accepts all emails
- **Source Tracking**: `sources` array shows where information was found
- **Time Stamps**: Track when data was extracted and last verified
- **Multi-Source**: Contact info may be found across multiple sources

## Use Cases

- **Lead Enrichment**: Enhance contact records with professional details
- **Email Verification**: Validate email addresses before outreach campaigns
- **Contact Building**: Build comprehensive contact profiles from email lists
- **CRM Enhancement**: Enrich existing customer databases
- **Marketing Research**: Gather insights about prospects and leads
- **Sales Intelligence**: Build detailed prospect profiles for sales teams

## Error Handling

The Actor gracefully handles various scenarios:

- **Invalid Emails**: Records error message for malformed addresses
- **No Data Found**: Logs when enrichment data is unavailable
- **Rate Limiting**: Automatically waits when API limits are reached
- **API Errors**: Captures and reports API-related issues

## Resources & Documentation

### API Documentation

- [Tomba API Docs](https://tomba.io/api) - Complete API reference
- [Authentication Guide](https://app.tomba.io/api) - Get your API keys
- [Pricing & Limits](https://tomba.io/pricing) - Understand rate limits and costs

### Rate Limiting

- Tomba limits to **300 requests per minute**
- Actor automatically handles rate limiting with delays
- Large batches may take time to complete

### Cost Considerations

- Each email processed = 1 Tomba API request
- Monitor your Tomba usage dashboard
- Consider Tomba's pricing tiers for volume usage
