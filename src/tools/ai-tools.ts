/**
 * AI-assisted tools for Amazon Selling Partner API
 */

import { z } from 'zod';
import { ToolRegistrationManager } from '../server/tools.js';
import { ListingsClient } from '../api/listings-client.js';
import { CatalogClient } from '../api/catalog-client.js';
import { AuthConfig } from '../types/auth.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Register AI-assisted tools with the tool manager
 *
 * @param toolManager Tool registration manager
 * @param authConfig Authentication configuration
 */
export function registerAiTools(
  toolManager: ToolRegistrationManager,
  authConfig: AuthConfig,
  server: McpServer
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
    async (input) => {
      try {
        // Call the LLM through MCP sampling
        const response = await server.createMessage({
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please write an optimized Amazon product description for the following product:
                
Title: ${input.productTitle}
Key Features: ${input.keyFeatures.join(', ')}
${input.targetAudience ? `Target Audience: ${input.targetAudience}` : ''}
${input.brandName ? `Brand: ${input.brandName}` : ''}
${input.category ? `Category: ${input.category}` : ''}
${input.competitiveAdvantages ? `Competitive Advantages: ${input.competitiveAdvantages.join(', ')}` : ''}
${input.tone ? `Tone: ${input.tone}` : ''}
${input.maxLength ? `Maximum Length: ${input.maxLength} characters` : ''}

The description should be compelling, highlight the key features, and be optimized for Amazon SEO. 
Format the description with appropriate paragraph breaks and bullet points for readability.`,
              },
            },
          ],
          maxTokens: 1000,
        });

        return {
          content: [
            {
              type: 'text',
              text:
                response.content.type === 'text'
                  ? `Generated Product Description:\n\n${response.content.text}`
                  : 'Unable to generate product description',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error generating product description: ${(error as Error).message}`,
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
    async (input) => {
      try {
        // First, get the existing listing
        let listing;
        try {
          listing = await listingsClient.getListing(input.sku);
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Listing with SKU ${input.sku} not found. Cannot optimize a non-existent listing.`,
              },
            ],
            isError: true,
          };
        }

        // Get competitor listings if ASINs are provided
        let competitorData = [];
        if (input.competitorAsins && input.competitorAsins.length > 0) {
          for (const asin of input.competitorAsins) {
            try {
              const competitorItem = await catalogClient.getCatalogItem(asin);
              competitorData.push(competitorItem);
            } catch (error) {
              console.warn(
                `Could not retrieve competitor data for ASIN ${asin}: ${(error as Error).message}`
              );
            }
          }
        }

        // Extract relevant information from the listing
        const productTitle = listing.attributes.title || '';
        const bulletPoints = listing.attributes.bullet_points || [];
        const description = listing.attributes.description || '';
        const keywords = listing.attributes.keywords || [];

        // Call the LLM through MCP sampling to get optimization suggestions
        const response = await server.createMessage({
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please analyze and provide optimization suggestions for the following Amazon product listing:
                
Current Title: ${productTitle}
Current Bullet Points: ${JSON.stringify(bulletPoints)}
Current Description: ${description}
Current Keywords: ${keywords.join(', ')}

Optimization Goal: ${input.optimizationGoal}
${input.targetKeywords ? `Target Keywords to Include: ${input.targetKeywords.join(', ')}` : ''}
${input.includeA9Tips ? 'Please include Amazon A9 algorithm optimization tips.' : ''}

${
  competitorData.length > 0
    ? `Competitor Products for Reference:
${competitorData
  .map(
    (item, index) => `
Competitor ${index + 1}:
Title: ${item.attributes?.title || 'N/A'}
Bullet Points: ${JSON.stringify(item.attributes?.bullet_points || [])}
`
  )
  .join('\n')}`
    : ''
}

Please provide:
1. An optimized product title
2. Improved bullet points
3. An enhanced product description
4. Suggested backend keywords
5. Specific recommendations for improving the listing's ${input.optimizationGoal === 'both' ? 'conversion rate and visibility' : input.optimizationGoal}
${input.includeA9Tips ? '6. Amazon A9 algorithm optimization tips' : ''}
`,
              },
            },
          ],
          maxTokens: 1500,
        });

        return {
          content: [
            {
              type: 'text',
              text:
                response.content.type === 'text'
                  ? `Listing Optimization Analysis for SKU ${input.sku}:\n\n${response.content.text}`
                  : 'Unable to generate listing optimization suggestions',
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
