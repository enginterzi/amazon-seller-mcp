/**
 * AI-assisted tools for Amazon Selling Partner API
 */

// Third-party dependencies
import { z } from 'zod';

// Internal imports
import { ToolRegistrationManager } from '../server/tools.js';
import { ListingsClient } from '../api/listings-client.js';
import { CatalogClient } from '../api/catalog-client.js';
import { AuthConfig } from '../types/auth.js';
import { warn } from '../utils/logger.js';

/**
 * Register AI-assisted tools with the tool manager
 *
 * @param toolManager Tool registration manager
 * @param authConfig Authentication configuration
 */
export function registerAiTools(
  toolManager: ToolRegistrationManager,
  authConfig: AuthConfig
): void {
  const listingsClient = new ListingsClient(authConfig);
  const catalogClient = new CatalogClient(authConfig);

  // Register product description generation tool
  toolManager.registerTool(
    'generate-product-description',
    {
      title: 'Generate Product Description',
      description: 'Generate an optimized product description using AI',
      inputSchema: z.object({
        productTitle: z.string().describe('Product title'),
        keyFeatures: z.array(z.string()).describe('Key product features'),
        targetAudience: z.string().optional().describe('Target audience for the product'),
        brandName: z.string().optional().describe('Brand name'),
        category: z.string().optional().describe('Product category'),
        competitiveAdvantages: z
          .array(z.string())
          .optional()
          .describe('Competitive advantages of the product'),
        tone: z
          .enum(['professional', 'casual', 'enthusiastic', 'technical'])
          .optional()
          .describe('Tone of the description'),
        maxLength: z
          .number()
          .optional()
          .describe('Maximum length of the description in characters'),
      }),
    },
    async (input: unknown) => {
      try {
        // Validate input
        const validatedInput = z
          .object({
            productTitle: z.string(),
            keyFeatures: z.array(z.string()),
            targetAudience: z.string().optional(),
            brandName: z.string().optional(),
            category: z.string().optional(),
            competitiveAdvantages: z.array(z.string()).optional(),
            tone: z.enum(['professional', 'casual', 'enthusiastic', 'technical']).optional(),
            maxLength: z.number().optional(),
          })
          .parse(input);

        // Generate a structured prompt for the user to use with an AI assistant
        const prompt = `Please write an optimized Amazon product description for the following product:

Title: ${validatedInput.productTitle}
Key Features: ${validatedInput.keyFeatures.join(', ')}
${validatedInput.targetAudience ? `Target Audience: ${validatedInput.targetAudience}` : ''}
${validatedInput.brandName ? `Brand: ${validatedInput.brandName}` : ''}
${validatedInput.category ? `Category: ${validatedInput.category}` : ''}
${validatedInput.competitiveAdvantages ? `Competitive Advantages: ${validatedInput.competitiveAdvantages.join(', ')}` : ''}
${validatedInput.tone ? `Tone: ${validatedInput.tone}` : ''}
${validatedInput.maxLength ? `Maximum Length: ${validatedInput.maxLength} characters` : ''}

The description should be:
- Compelling and engaging
- Highlight the key features and benefits
- Optimized for Amazon SEO
- Formatted with appropriate paragraph breaks and bullet points for readability
- Written in ${validatedInput.tone || 'professional'} tone
${validatedInput.maxLength ? `- Limited to ${validatedInput.maxLength} characters` : ''}

Please structure the description with:
1. An attention-grabbing opening paragraph
2. Key features and benefits in bullet points or short paragraphs
3. A compelling closing that encourages purchase`;

        return {
          content: [
            {
              type: 'text',
              text: `Product Description Generation Prompt:\n\n${prompt}\n\n---\n\nCopy the above prompt and use it with your preferred AI assistant to generate an optimized product description.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error generating product description prompt: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register listing optimization tool
  toolManager.registerTool(
    'optimize-listing',
    {
      title: 'Optimize Amazon Listing',
      description: 'Analyze and optimize an existing Amazon listing',
      inputSchema: z.object({
        sku: z.string().describe('Seller SKU for the product to optimize'),
        optimizationGoal: z
          .enum(['conversion', 'visibility', 'both'])
          .describe('Optimization goal'),
        competitorAsins: z
          .array(z.string())
          .optional()
          .describe('ASINs of competitor products for comparison'),
        targetKeywords: z.array(z.string()).optional().describe('Target keywords to include'),
        includeA9Tips: z
          .boolean()
          .optional()
          .describe('Include Amazon A9 algorithm optimization tips'),
      }),
    },
    async (input: unknown) => {
      try {
        // Validate input
        const validatedInput = z
          .object({
            sku: z.string(),
            optimizationGoal: z.enum(['conversion', 'visibility', 'both']),
            competitorAsins: z.array(z.string()).optional(),
            targetKeywords: z.array(z.string()).optional(),
            includeA9Tips: z.boolean().optional(),
          })
          .parse(input);

        // First, get the existing listing
        let listing;
        try {
          listing = await listingsClient.getListing(validatedInput.sku);
        } catch {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Listing with SKU ${validatedInput.sku} not found. Cannot optimize a non-existent listing.`,
              },
            ],
            isError: true,
          };
        }

        // Get competitor listings if ASINs are provided
        const competitorData = [];
        if (validatedInput.competitorAsins && validatedInput.competitorAsins.length > 0) {
          for (const asin of validatedInput.competitorAsins) {
            try {
              const competitorItem = await catalogClient.getCatalogItem({ asin });
              competitorData.push(competitorItem);
            } catch (err) {
              warn(
                `Could not retrieve competitor data for ASIN ${asin}: ${(err as Error).message}`
              );
            }
          }
        }

        // Extract relevant information from the listing
        const productTitle = listing.attributes?.title || '';
        const bulletPoints = listing.attributes?.bullet_points || [];
        const description = listing.attributes?.description || '';
        const keywords = listing.attributes?.keywords || [];

        // Generate a structured prompt for listing optimization
        const prompt = `Please analyze and provide optimization suggestions for the following Amazon product listing:

Current Title: ${productTitle}
Current Bullet Points: ${JSON.stringify(bulletPoints)}
Current Description: ${description}
Current Keywords: ${Array.isArray(keywords) ? keywords.join(', ') : keywords}

Optimization Goal: ${validatedInput.optimizationGoal}
${validatedInput.targetKeywords ? `Target Keywords to Include: ${validatedInput.targetKeywords.join(', ')}` : ''}
${validatedInput.includeA9Tips ? 'Please include Amazon A9 algorithm optimization tips.' : ''}

${
  competitorData.length > 0
    ? `Competitor Products for Reference:
${competitorData
  .map(
    (item, index) => `
Competitor ${index + 1}:
Title: ${item.summaries?.[0]?.itemName || 'N/A'}
Brand: ${item.summaries?.[0]?.brandName || 'N/A'}
ASIN: ${item.asin}
`
  )
  .join('\n')}`
    : ''
}

Please provide:
1. An optimized product title
2. Improved bullet points (5 key benefits)
3. An enhanced product description
4. Suggested backend keywords
5. Specific recommendations for improving the listing's ${validatedInput.optimizationGoal === 'both' ? 'conversion rate and visibility' : validatedInput.optimizationGoal}
${validatedInput.includeA9Tips ? '6. Amazon A9 algorithm optimization tips' : ''}

Focus on:
- Keyword optimization for search visibility
- Compelling benefit-focused copy
- Clear value propositions
- Competitive differentiation
- Amazon best practices`;

        return {
          content: [
            {
              type: 'text',
              text: `Listing Optimization Analysis for SKU ${validatedInput.sku}:\n\n${prompt}\n\n---\n\nCopy the above analysis and use it with your preferred AI assistant to get detailed optimization recommendations.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error optimizing listing: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
