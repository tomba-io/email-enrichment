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

## FAQ

### General Questions

**Q: What is email enrichment?**
A: Email enrichment takes an email address and returns detailed information about the person and company associated with it, including name, job title, company details, social profiles, and contact information.

**Q: What kind of information can I get from email enrichment?**
A: You can get personal details (name, location, social profiles), professional information (job title, company, seniority), company data (size, industry, location), and verification status.

**Q: How accurate is the enriched data?**
A: Tomba maintains high data quality with regular updates. Accuracy varies by email and company, but typically ranges from 85-95% for professional email addresses.

### Usage & Features

**Q: Can I enrich personal email addresses (Gmail, Yahoo, etc.)?**
A: Email enrichment works best with business/professional email addresses. Personal email domains provide limited information since they're not associated with company data.

**Q: How many emails can I enrich at once?**
A: You can process up to 1000 emails per run. For optimal performance, process 50-200 emails per batch.

**Q: What if an email can't be enriched?**
A: If no information is found, the result will contain minimal data. This is normal for new email addresses, private individuals, or emails from companies with limited public information.

**Q: Do you provide social media profiles?**
A: Yes, when available, enrichment includes LinkedIn, Twitter, and other social media profiles associated with the person.

### Technical Questions

**Q: What are the rate limits?**
A: Tomba allows 300 requests per minute for enrichment. The Actor automatically handles rate limiting with appropriate delays.

**Q: How fresh is the enriched data?**
A: Tomba continuously updates its database. Each result includes timestamps showing when the data was last verified or updated.

**Q: Can I use this for real-time enrichment?**
A: Yes, but consider API response times (typically 1-2 seconds per email). For real-time applications, you might want to enrich emails asynchronously.

**Q: What happens with invalid email addresses?**
A: Invalid emails will still be processed, but will return minimal or no enrichment data. Consider verifying emails first for better results.

### Data & Privacy

**Q: Where does the enrichment data come from?**
A: Data comes from publicly available sources including company websites, professional networks, social media, and other legitimate public databases.

**Q: Is this GDPR compliant?**
A: Yes, Tomba follows GDPR guidelines and only uses publicly available information. All data collection complies with privacy regulations.

**Q: How current is the job title and company information?**
A: Professional information is updated regularly, but changes in employment may take time to reflect. Timestamps help you assess data freshness.

**Q: Can I enrich my own contact database?**
A: Yes, this is a common use case. Ensure you have appropriate permissions to enrich emails in your database and comply with privacy regulations.

### Business Applications

**Q: How can I use enriched data for sales?**
A: Enriched data helps qualify leads, personalize outreach, understand company hierarchy, and identify decision-makers. Use job titles and company info to tailor your approach.

**Q: Is this useful for marketing campaigns?**
A: Absolutely! Enrichment helps segment audiences, personalize content, understand company characteristics, and improve targeting for B2B campaigns.

**Q: Can I use this for customer support?**
A: Yes, enriching customer emails helps support teams understand who they're helping, their role, and company context for better service.

**Q: How does this help with lead scoring?**
A: Company size, industry, job titles, and seniority levels from enrichment can feed into lead scoring models to prioritize high-value prospects.

## Keywords

email enrichment, contact enrichment, profile enhancement, lead enrichment, data enrichment, contact information, professional profiles, sales intelligence, prospect research, contact data, business intelligence

## Support

If you need any help, have questions, or encounter any issues while using Tomba.io, please don't hesitate to reach out to our support team. You can contact us via:

- **Email**: support@tomba.io
- **Live chat**: Available on the Tomba.io website during business hours

## Contributing

We welcome contributions to improve this actor. Please feel free to submit issues, feature requests, or pull requests to help make this tool even better for the community.

## About Tomba

Founded in 2020, Tomba prides itself on being the most reliable, accurate, and in-depth source of email address data available anywhere. We process terabytes of data to produce our Email finder API.

![Tomba Logo](https://tomba.io/logo.png)
