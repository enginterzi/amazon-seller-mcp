# Amazon Seller MCP Client

[![npm version](https://badge.fury.io/js/amazon-seller-mcp-client.svg)](https://badge.fury.io/js/amazon-seller-mcp-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/your-username/amazon-seller-mcp-client.svg?style=social&label=Star)](https://github.com/your-username/amazon-seller-mcp-client)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

> 🤖 **Transform Your Amazon Business with AI** - The first Model Context Protocol (MCP) client that seamlessly connects Claude and other AI agents to Amazon's Selling Partner API, enabling intelligent automation of your entire seller workflow from inventory management to listing optimization.

**🎯 Revolutionize Amazon selling through AI-powered automation** • **⚡ Zero-setup MCP integration** • **🛡️ Enterprise-grade security** • **🌍 Global marketplace support**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Installation & Deployment](#installation--deployment)
- [MCP Server Configuration](#mcp-server-configuration)
- [Available Tools & Resources](#available-tools--resources)
- [Usage Examples](#usage-examples)
- [Authentication & Security](#authentication--security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Support](#support)

---

## 🎯 Overview

**Amazon Seller MCP Client** is the first and most comprehensive Model Context Protocol (MCP) integration for Amazon's Selling Partner API, designed to unlock the full potential of AI-assisted e-commerce operations. By bridging the gap between advanced AI agents like Claude and Amazon's powerful seller ecosystem, this library transforms how sellers manage their business operations.

**🚀 Why MCP + Amazon SP-API Changes Everything:**
- **Intelligent Automation**: AI agents can now understand, analyze, and act on your Amazon data in real-time
- **Natural Language Operations**: Manage inventory, process orders, and optimize listings through conversational AI
- **Context-Aware Decisions**: AI agents maintain full context of your seller operations across all interactions
- **Seamless Integration**: Works instantly with Claude Desktop and any MCP-compatible AI client

**💡 The Value Proposition:**
Transform weeks of manual Amazon seller tasks into minutes of AI-powered automation. Whether you're optimizing product listings, managing inventory across multiple marketplaces, or analyzing sales performance, our MCP integration enables AI agents to work as your intelligent business partner, not just a tool.

### ✨ Key Features & Capabilities

#### 🔌 **Model Context Protocol (MCP) Integration**
- **Universal AI Compatibility** - Works with Claude Desktop, OpenAI, and any MCP-compatible AI client
- **Persistent Context** - AI agents maintain full conversation context across all Amazon operations
- **Real-time Communication** - Bidirectional communication between AI agents and Amazon APIs
- **Resource Discovery** - AI agents can explore and understand your Amazon data structure dynamically

#### 📦 **Complete Amazon SP-API Coverage**
- **🛍️ Catalog API** - Product search, category browsing, ASIN lookup, and product details
- **📝 Listings API** - Create, update, delete, and manage product listings across marketplaces
- **📊 Inventory API** - Real-time inventory tracking, quantity updates, and stock management
- **🛒 Orders API** - Order retrieval, status updates, fulfillment management, and customer communication
- **📈 Reports API** - Business analytics, sales reports, inventory reports, and performance metrics
- **🔍 Product Type Definitions** - Dynamic product category requirements and validation

#### 🤖 **AI-Assisted Smart Operations**
- **✍️ Intelligent Content Generation** - Generate structured prompts for AI assistants to create product titles, descriptions, and bullet points
- **🎯 Listing Optimization** - Create detailed analysis prompts for AI-powered SEO optimization and competitor research
- **📊 Performance Analysis** - AI-driven insights on sales trends, pricing strategies, and market opportunities
- **🔄 Automated Workflows** - Multi-step operations like bulk listing updates and inventory synchronization
- **⚠️ Proactive Monitoring** - AI alerts for inventory issues, pricing changes, and performance anomalies

#### 🛡️ **Enterprise-Grade Security & Performance**
- **🔐 Secure Authentication** - OAuth 2.0 with automatic token refresh and credential encryption
- **⚡ High Performance** - Built-in caching, connection pooling, and intelligent rate limiting
- **🌍 Global Marketplace Support** - All Amazon regions (US, EU, Asia-Pacific, Middle East, etc.)
- **📊 Comprehensive Logging** - Detailed audit trails and performance monitoring
- **🔄 Error Recovery** - Automatic retry logic with exponential backoff and circuit breakers

### 🎯 Target Audience & Use Cases

#### 🛒 **Amazon Sellers & Entrepreneurs**
- **Solo Sellers** - Automate routine tasks like inventory updates, order processing, and listing optimization
- **Growing Businesses** - Scale operations across multiple products and marketplaces with AI assistance
- **Private Label Brands** - Leverage AI for product research, competitive analysis, and content creation
- **Dropshippers** - Streamline supplier management and automated order fulfillment workflows

#### 👨‍💻 **Developers & Technical Teams**
- **E-commerce Developers** - Build sophisticated Amazon integrations with minimal API complexity
- **AI/ML Engineers** - Create intelligent seller tools using natural language processing
- **SaaS Builders** - Integrate Amazon seller functionality into existing business applications
- **Automation Specialists** - Design complex multi-step workflows for seller operations

#### 🏢 **Agencies & Service Providers**
- **Amazon Marketing Agencies** - Manage multiple client accounts with AI-powered efficiency
- **E-commerce Consultants** - Provide data-driven insights and automated optimization services
- **Virtual Assistant Services** - Offer advanced Amazon management capabilities to clients
- **Software Integrators** - Connect Amazon operations with CRM, ERP, and other business systems

#### 🏭 **Enterprise & Large Organizations**
- **Multi-Brand Companies** - Coordinate Amazon operations across multiple product lines
- **Retail Corporations** - Integrate Amazon marketplace with existing retail infrastructure
- **Supply Chain Teams** - Automate inventory management and demand forecasting
- **Business Intelligence Teams** - Extract actionable insights from Amazon performance data

**💼 Common Use Cases:**
- Automated inventory management across multiple marketplaces
- AI-generated product descriptions and SEO optimization
- Real-time order processing and customer communication
- Competitive pricing analysis and dynamic price adjustments
- Bulk listing creation and management for large catalogs
- Performance monitoring and automated reporting dashboards

---

## 🚀 Quick Start

Get up and running in under 5 minutes with our streamlined setup process.

### 📋 Prerequisites & System Requirements

#### **System Requirements**
- **Node.js**: Version 18.0.0 or higher (LTS recommended)
- **Operating System**: 
  - ✅ macOS 10.15+ (Catalina or later)
  - ✅ Windows 10/11 (with WSL2 recommended)
  - ✅ Linux (Ubuntu 18.04+, CentOS 7+, or equivalent)
- **Memory**: Minimum 512MB RAM available
- **Storage**: 100MB free disk space
- **Network**: Stable internet connection for Amazon SP-API access

#### **Required Amazon SP-API Credentials**
Before you begin, you'll need to obtain the following from your [Amazon Developer Console](https://developer.amazon.com/):

1. **Client ID** (`AMAZON_CLIENT_ID`)
   - Format: `amzn1.application-oa2-client.xxxxxxxxx`
   - Obtained when creating your SP-API application

2. **Client Secret** (`AMAZON_CLIENT_SECRET`)
   - Secure string provided during application setup
   - Keep this confidential and never commit to version control

3. **Refresh Token** (`AMAZON_REFRESH_TOKEN`)
   - Format: `Atzr|IwEBIxxxxxxxxx`
   - Generated through the OAuth authorization flow

4. **Marketplace ID** (`AMAZON_MARKETPLACE_ID`)
   - US: `ATVPDKIKX0DER`
   - UK: `A1F83G8C2ARO7P`
   - Germany: `A1PA6795UKMFR9`
   - [Full list of marketplace IDs](https://developer-docs.amazon.com/sp-api/docs/marketplace-ids)

#### **MCP Client Requirements**
- **Claude Desktop**: Version 1.0.0 or higher (recommended)
- **Alternative MCP Clients**: Any client supporting MCP protocol v1.0+
- **Configuration Access**: Ability to modify MCP client configuration files

#### **Development Tools (Optional)**
- **Code Editor**: VS Code, WebStorm, or similar with TypeScript support
- **Git**: For version control and contributing
- **Docker**: For containerized deployment (optional)

#### **Network & Security Requirements**
- **Outbound HTTPS**: Access to `sellingpartnerapi-na.amazon.com` and regional endpoints
- **Port Access**: No inbound ports required (outbound only)
- **Firewall**: Allow connections to Amazon SP-API endpoints
- **Proxy Support**: HTTP/HTTPS proxy configuration supported via environment variables

### 🚀 Installation Options

Choose the installation method that best fits your workflow:

#### **Option 1: npx (Fastest - No Installation Required)**
Perfect for quick testing and evaluation:

```bash
# Run directly without any installation
npx amazon-seller-mcp-client

# Check if it's working
npx amazon-seller-mcp-client --version

# Run with specific configuration
npx amazon-seller-mcp-client --marketplace=ATVPDKIKX0DER
```

**Pros:** ✅ No installation required, always latest version, perfect for testing  
**Cons:** ❌ Slower startup, requires internet for first run

#### **Option 2: Global npm Installation**
Best for regular use and development:

```bash
# Install globally
npm install -g amazon-seller-mcp-client

# Verify installation
amazon-seller-mcp-client --version

# Run from anywhere
amazon-seller-mcp-client --help
```

**Pros:** ✅ Fast startup, works offline, consistent version  
**Cons:** ❌ Requires manual updates, potential version conflicts

#### **Option 3: Local Development Setup**
Ideal for contributing or customizing the client:

```bash
# Clone the repository
git clone https://github.com/your-username/amazon-seller-mcp-client.git
cd amazon-seller-mcp-client

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Or run the built version
npm start
```

**Pros:** ✅ Full control, easy debugging, contribution-ready  
**Cons:** ❌ More setup time, requires Git and build tools

#### **Option 4: Package Manager Alternatives**

**Using Yarn:**
```bash
# Global installation
yarn global add amazon-seller-mcp-client

# Or run directly
yarn dlx amazon-seller-mcp-client
```

**Using pnpm:**
```bash
# Global installation
pnpm add -g amazon-seller-mcp-client

# Or run directly
pnpm dlx amazon-seller-mcp-client
```

### ⚡ Quick Verification Steps

After installation, verify everything is working correctly:

#### **Step 1: Basic Installation Check**
```bash
# Check if the client is installed and accessible
amazon-seller-mcp-client --version

# Expected output: amazon-seller-mcp-client v0.1.0
```

#### **Step 2: System Requirements Validation**
```bash
# Verify system compatibility
amazon-seller-mcp-client --system-check

# Expected output:
# ✅ Node.js version: 18.17.0 (compatible)
# ✅ Operating system: macOS 13.4.0 (supported)
# ✅ Memory available: 8.2 GB (sufficient)
# ✅ Network connectivity: OK
```

#### **Step 3: MCP Server Health Check**
```bash
# Test MCP server functionality (without credentials)
amazon-seller-mcp-client --health-check

# Expected output:
# ✅ MCP server: Running
# ✅ Protocol version: 1.0.0
# ✅ Available tools: 15
# ✅ Available resources: 5
```

#### **Step 4: Credential Validation (Optional)**
If you have Amazon SP-API credentials:

```bash
# Test authentication (requires environment variables)
export AMAZON_CLIENT_ID="your_client_id"
export AMAZON_CLIENT_SECRET="your_client_secret" 
export AMAZON_REFRESH_TOKEN="your_refresh_token"

amazon-seller-mcp-client --auth-test

# Expected output:
# ✅ Authentication: Success
# ✅ Token refresh: Working
# ✅ API access: Granted
# ✅ Marketplace: US (ATVPDKIKX0DER)
```

#### **Step 5: List Available Capabilities**
```bash
# View all available MCP tools
amazon-seller-mcp-client --list-tools

# View all available MCP resources  
amazon-seller-mcp-client --list-resources

# Get detailed help
amazon-seller-mcp-client --help
```

### 🔧 Troubleshooting Common Setup Issues

#### **Issue: Command not found**
```bash
# Problem: amazon-seller-mcp-client: command not found
# Solution: Check your PATH or use npx
npx amazon-seller-mcp-client --version

# Or reinstall globally
npm install -g amazon-seller-mcp-client
```

#### **Issue: Node.js version incompatible**
```bash
# Problem: Node.js version 16.x detected, requires 18.0.0+
# Solution: Update Node.js
nvm install 18
nvm use 18

# Or using official installer
# Download from: https://nodejs.org/
```

#### **Issue: Permission denied (macOS/Linux)**
```bash
# Problem: EACCES permission denied
# Solution: Fix npm permissions or use npx
sudo chown -R $(whoami) ~/.npm
npm install -g amazon-seller-mcp-client

# Or use npx instead
npx amazon-seller-mcp-client
```

#### **Issue: Network connectivity problems**
```bash
# Problem: Cannot connect to Amazon SP-API
# Solution: Check network and proxy settings
export HTTP_PROXY=http://your-proxy:8080
export HTTPS_PROXY=http://your-proxy:8080

# Test connectivity
curl -I https://sellingpartnerapi-na.amazon.com
```

#### **Issue: Authentication failures**
```bash
# Problem: 401 Unauthorized or invalid credentials
# Solution: Verify credential format and permissions

# Check credential format
echo $AMAZON_CLIENT_ID | grep "amzn1.application-oa2-client"
echo $AMAZON_REFRESH_TOKEN | grep "Atzr|"

# Test with minimal permissions first
amazon-seller-mcp-client --auth-test --minimal
```

### 🎯 Basic Configuration

Once verification is complete, configure your MCP client:

#### **Claude Desktop Configuration**
Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "amazon-seller": {
      "command": "npx",
      "args": ["amazon-seller-mcp-client"],
      "env": {
        "AMAZON_CLIENT_ID": "your_client_id",
        "AMAZON_CLIENT_SECRET": "your_client_secret",
        "AMAZON_REFRESH_TOKEN": "your_refresh_token",
        "AMAZON_MARKETPLACE_ID": "ATVPDKIKX0DER"
      }
    }
  }
}
```

#### **Configuration File Locations**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

#### **Final Verification with Claude**
1. Restart Claude Desktop
2. Start a new conversation
3. Type: "List available Amazon seller tools"
4. You should see MCP tools loaded and ready to use

---

## 📦 Installation & Deployment

Choose the deployment method that best fits your workflow:

| Method | Best For | Setup Time | Scalability |
|--------|----------|------------|-------------|
| **npx** | Quick testing | < 1 min | Low |
| **Docker** | Containerized apps | < 5 min | High |
| **Cloud Deploy** | Production use | < 10 min | Very High |
| **Local Dev** | Development | < 15 min | Medium |

### 🐳 Docker Deployment

```bash
# Pull and run the official image
docker run -d \
  --name amazon-seller-mcp \
  -e AMAZON_CLIENT_ID=your_client_id \
  -e AMAZON_CLIENT_SECRET=your_client_secret \
  -e AMAZON_REFRESH_TOKEN=your_refresh_token \
  amazon-seller-mcp-client:latest
```

### ☁️ One-Click Cloud Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/amazon-seller-mcp)

---

## ⚙️ MCP Server Configuration

Comprehensive configuration examples for different environments and use cases.

### 🖥️ Claude Desktop Configuration Examples

The Amazon Seller MCP Client integrates seamlessly with Claude Desktop through the Model Context Protocol. Below are detailed configuration examples for different use cases and environments.

#### **Configuration File Locations**

Before configuring, locate your Claude Desktop configuration file:

| Operating System | Configuration File Path | Alternative Locations |
|------------------|-------------------------|----------------------|
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` | `~/.claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` | `%USERPROFILE%\.claude\claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` | `~/.claude/claude_desktop_config.json` |

**💡 Pro Tips:**
- If the file doesn't exist, create it manually. Claude Desktop will automatically load the configuration on restart.
- Always backup your configuration before making changes
- Use a JSON validator to ensure proper syntax before saving
- Configuration changes require a Claude Desktop restart to take effect

#### **Basic Configuration (Documentation Tools Only)**

Perfect for exploring available tools and understanding capabilities without requiring Amazon SP-API credentials:

```json
{
  "mcpServers": {
    "amazon-seller-docs": {
      "command": "npx",
      "args": ["amazon-seller-mcp-client", "--docs-only"],
      "env": {
        "LOG_LEVEL": "info",
        "DOCS_MODE": "true",
        "SHOW_EXAMPLES": "true",
        "INCLUDE_SCHEMAS": "true"
      }
    }
  }
}
```

**What this provides:**
- ✅ Tool documentation and help
- ✅ Resource schema information  
- ✅ API endpoint references
- ✅ Example usage patterns
- ✅ Interactive tool exploration
- ❌ No actual Amazon SP-API access

**Use cases:**
- Learning the available tools and capabilities
- Understanding MCP resource structures
- Training team members on available operations
- API documentation and reference

#### **Full Configuration (Complete Amazon SP-API Access)**

Production-ready configuration with full Amazon Selling Partner API integration:

```json
{
  "mcpServers": {
    "amazon-seller": {
      "command": "npx",
      "args": ["amazon-seller-mcp-client"],
      "env": {
        "AMAZON_CLIENT_ID": "amzn1.application-oa2-client.xxxxxxxxxxxxx",
        "AMAZON_CLIENT_SECRET": "your_client_secret_here",
        "AMAZON_REFRESH_TOKEN": "Atzr|IwEBIxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "AMAZON_MARKETPLACE_ID": "ATVPDKIKX0DER",
        "AMAZON_REGION": "us-east-1",
        "LOG_LEVEL": "info",
        "CACHE_ENABLED": "true",
        "CACHE_TTL": "300",
        "RATE_LIMIT_ENABLED": "true",
        "MAX_REQUESTS_PER_SECOND": "10",
        "REQUEST_TIMEOUT": "30000",
        "RETRY_ATTEMPTS": "3",
        "RETRY_DELAY": "1000"
      }
    }
  }
}
```

**What this provides:**
- ✅ Full Amazon SP-API access
- ✅ All MCP tools and resources
- ✅ Real-time data operations
- ✅ AI-assisted seller operations
- ✅ Production-grade performance
- ✅ Automatic error recovery

**Environment variables explained:**
- `CACHE_TTL`: Cache time-to-live in seconds (300 = 5 minutes)
- `MAX_REQUESTS_PER_SECOND`: Rate limiting threshold
- `REQUEST_TIMEOUT`: API request timeout in milliseconds
- `RETRY_ATTEMPTS`: Number of retry attempts for failed requests
- `RETRY_DELAY`: Delay between retries in milliseconds

#### **Development Configuration (Enhanced Debugging)**

Ideal for development and troubleshooting with detailed logging:

```json
{
  "mcpServers": {
    "amazon-seller-dev": {
      "command": "npx",
      "args": ["amazon-seller-mcp-client", "--dev-mode"],
      "env": {
        "AMAZON_CLIENT_ID": "amzn1.application-oa2-client.dev-xxxxx",
        "AMAZON_CLIENT_SECRET": "dev_client_secret",
        "AMAZON_REFRESH_TOKEN": "Atzr|IwEBIdev-token-xxxxx",
        "AMAZON_MARKETPLACE_ID": "ATVPDKIKX0DER",
        "AMAZON_REGION": "us-east-1",
        "LOG_LEVEL": "debug",
        "DEBUG_MODE": "true",
        "VERBOSE_LOGGING": "true",
        "LOG_REQUESTS": "true",
        "LOG_RESPONSES": "true",
        "MOCK_API_RESPONSES": "false",
        "REQUEST_TIMEOUT": "30000",
        "MAX_RETRIES": "3",
        "PERFORMANCE_MONITORING": "true",
        "MEMORY_MONITORING": "true"
      }
    }
  }
}
```

**Development features:**
- � Debug--level logging with full request/response details
- 📊 Request/response tracing and timing
- ⏱️ Performance metrics and memory monitoring
- 🔄 Enhanced error reporting with stack traces
- 🧪 Optional API response mocking for testing
- 📈 Real-time performance analytics

#### **Sandbox Configuration (Testing Environment)**

Safe testing environment using Amazon's sandbox endpoints:

```json
{
  "mcpServers": {
    "amazon-seller-sandbox": {
      "command": "npx",
      "args": ["amazon-seller-mcp-client", "--sandbox"],
      "env": {
        "AMAZON_CLIENT_ID": "amzn1.application-oa2-client.sandbox-xxxxx",
        "AMAZON_CLIENT_SECRET": "sandbox_client_secret",
        "AMAZON_REFRESH_TOKEN": "Atzr|IwEBIsandbox-token-xxxxx",
        "AMAZON_MARKETPLACE_ID": "ATVPDKIKX0DER",
        "AMAZON_REGION": "us-east-1",
        "SANDBOX_MODE": "true",
        "LOG_LEVEL": "info",
        "MOCK_DATA_ENABLED": "true",
        "SAFE_MODE": "true",
        "DISABLE_WRITE_OPERATIONS": "false"
      }
    }
  }
}
```

**Sandbox benefits:**
- 🧪 Safe testing environment with no real data impact
- 📝 Simulated API responses for development
- 🔄 Unlimited API calls without rate limiting
- 🛡️ Risk-free experimentation with all features
- 📊 Consistent test data for reproducible results

#### **Multi-Marketplace Configuration**

Manage multiple Amazon marketplaces simultaneously:

```json
{
  "mcpServers": {
    "amazon-seller-us": {
      "command": "npx",
      "args": ["amazon-seller-mcp-client"],
      "env": {
        "AMAZON_CLIENT_ID": "amzn1.application-oa2-client.us-xxxxx",
        "AMAZON_CLIENT_SECRET": "us_client_secret",
        "AMAZON_REFRESH_TOKEN": "Atzr|IwEBIus-token-xxxxx",
        "AMAZON_MARKETPLACE_ID": "ATVPDKIKX0DER",
        "AMAZON_REGION": "us-east-1",
        "SERVER_NAME": "US Marketplace",
        "CURRENCY": "USD",
        "TIMEZONE": "America/New_York"
      }
    },
    "amazon-seller-uk": {
      "command": "npx",
      "args": ["amazon-seller-mcp-client"],
      "env": {
        "AMAZON_CLIENT_ID": "amzn1.application-oa2-client.uk-xxxxx",
        "AMAZON_CLIENT_SECRET": "uk_client_secret",
        "AMAZON_REFRESH_TOKEN": "Atzr|IwEBIuk-token-xxxxx",
        "AMAZON_MARKETPLACE_ID": "A1F83G8C2ARO7P",
        "AMAZON_REGION": "eu-west-1",
        "SERVER_NAME": "UK Marketplace",
        "CURRENCY": "GBP",
        "TIMEZONE": "Europe/London"
      }
    },
    "amazon-seller-de": {
      "command": "npx",
      "args": ["amazon-seller-mcp-client"],
      "env": {
        "AMAZON_CLIENT_ID": "amzn1.application-oa2-client.de-xxxxx",
        "AMAZON_CLIENT_SECRET": "de_client_secret",
        "AMAZON_REFRESH_TOKEN": "Atzr|IwEBIde-token-xxxxx",
        "AMAZON_MARKETPLACE_ID": "A1PA6795UKMFR9",
        "AMAZON_REGION": "eu-west-1",
        "SERVER_NAME": "Germany Marketplace",
        "CURRENCY": "EUR",
        "TIMEZONE": "Europe/Berlin"
      }
    },
    "amazon-seller-jp": {
      "command": "npx",
      "args": ["amazon-seller-mcp-client"],
      "env": {
        "AMAZON_CLIENT_ID": "amzn1.application-oa2-client.jp-xxxxx",
        "AMAZON_CLIENT_SECRET": "jp_client_secret",
        "AMAZON_REFRESH_TOKEN": "Atzr|IwEBIjp-token-xxxxx",
        "AMAZON_MARKETPLACE_ID": "A1VC38T7YXB528",
        "AMAZON_REGION": "us-west-2",
        "SERVER_NAME": "Japan Marketplace",
        "CURRENCY": "JPY",
        "TIMEZONE": "Asia/Tokyo"
      }
    }
  }
}
```

**Multi-marketplace benefits:**
- 🌍 Simultaneous access to multiple regions
- 💱 Currency-aware operations
- 🕐 Timezone-specific scheduling
- 📊 Cross-marketplace analytics
- 🔄 Synchronized inventory management

#### **Local Installation Configuration**

Using locally installed package instead of npx for better performance:

```json
{
  "mcpServers": {
    "amazon-seller-local": {
      "command": "amazon-seller-mcp-client",
      "args": ["--local-mode"],
      "env": {
        "AMAZON_CLIENT_ID": "amzn1.application-oa2-client.xxxxx",
        "AMAZON_CLIENT_SECRET": "your_client_secret",
        "AMAZON_REFRESH_TOKEN": "Atzr|IwEBIxxxxx",
        "AMAZON_MARKETPLACE_ID": "ATVPDKIKX0DER",
        "AMAZON_REGION": "us-east-1",
        "LOCAL_CACHE_PATH": "~/.amazon-seller-mcp/cache",
        "LOCAL_LOGS_PATH": "~/.amazon-seller-mcp/logs"
      }
    }
  }
}
```

**Prerequisites:** Install globally first:
```bash
npm install -g amazon-seller-mcp-client
```

**Local installation benefits:**
- ⚡ Faster startup times (no download required)
- 💾 Persistent local caching
- 📁 Local log file storage
- 🔒 Offline capability for cached data

#### **Docker Configuration**

Using Docker container for isolated and consistent execution:

```json
{
  "mcpServers": {
    "amazon-seller-docker": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "--env-file", "/path/to/.env",
        "--volume", "/local/cache:/app/cache",
        "--volume", "/local/logs:/app/logs",
        "amazon-seller-mcp-client:latest"
      ],
      "env": {
        "DOCKER_MODE": "true",
        "CONTAINER_NAME": "amazon-seller-mcp"
      }
    }
  }
}
```

**Environment file (`.env`):**
```bash
AMAZON_CLIENT_ID=amzn1.application-oa2-client.xxxxx
AMAZON_CLIENT_SECRET=your_client_secret
AMAZON_REFRESH_TOKEN=Atzr|IwEBIxxxxx
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER
AMAZON_REGION=us-east-1
LOG_LEVEL=info
CACHE_ENABLED=true
```

**Docker benefits:**
- 🐳 Consistent execution environment
- 🔒 Isolated from host system
- 📦 Easy deployment and scaling
- 🔄 Version control for entire stack

#### **High-Performance Configuration**

Optimized for high-volume operations:

```json
{
  "mcpServers": {
    "amazon-seller-performance": {
      "command": "npx",
      "args": ["amazon-seller-mcp-client", "--performance-mode"],
      "env": {
        "AMAZON_CLIENT_ID": "amzn1.application-oa2-client.xxxxx",
        "AMAZON_CLIENT_SECRET": "your_client_secret",
        "AMAZON_REFRESH_TOKEN": "Atzr|IwEBIxxxxx",
        "AMAZON_MARKETPLACE_ID": "ATVPDKIKX0DER",
        "AMAZON_REGION": "us-east-1",
        "PERFORMANCE_MODE": "true",
        "CONNECTION_POOL_SIZE": "20",
        "CACHE_SIZE_MB": "256",
        "BATCH_SIZE": "100",
        "PARALLEL_REQUESTS": "5",
        "COMPRESSION_ENABLED": "true",
        "KEEP_ALIVE": "true",
        "REQUEST_TIMEOUT": "60000"
      }
    }
  }
}
```

**Performance optimizations:**
- 🚀 Connection pooling for faster requests
- 💾 Large cache for frequently accessed data
- 📦 Batch processing for bulk operations
- ⚡ Parallel request processing
- 🗜️ Response compression
- 🔄 Keep-alive connections

#### **Configuration Validation**

After updating your configuration, validate it works correctly:

1. **Backup Current Config** - Always backup before changes:
   ```bash
   cp ~/Library/Application\ Support/Claude/claude_desktop_config.json ~/claude_config_backup.json
   ```

2. **Validate JSON Syntax** - Use a JSON validator:
   ```bash
   python -m json.tool ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. **Restart Claude Desktop** - Configuration changes require a restart

4. **Test Connection** - Start a new conversation and type:
   ```
   List available Amazon seller tools
   ```

5. **Verify Tools Load** - You should see MCP tools listed with descriptions

6. **Test Basic Operation** - Try a simple command:
   ```
   Get my Amazon marketplace information
   ```

7. **Check Logs** - Monitor for any connection issues:
   ```bash
   tail -f ~/.amazon-seller-mcp/logs/mcp-server.log
   ```

#### **Configuration Troubleshooting**

Common configuration issues and solutions:

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **JSON Syntax Error** | Claude won't start or shows config error | Validate JSON syntax, check for missing commas/brackets |
| **Command Not Found** | MCP server fails to start | Verify `npx` is installed or use full path |
| **Permission Denied** | Server startup fails | Check file permissions and user access |
| **Environment Variables** | Authentication failures | Verify all required env vars are set correctly |
| **Path Issues** | Config file not found | Check file location matches your OS |

#### **Configuration Best Practices**

**✅ Security Best Practices:**
- Use environment variables for sensitive data
- Never commit credentials to version control
- Rotate credentials regularly
- Use different credentials for different environments
- Enable audit logging for production

**✅ Performance Best Practices:**
- Enable caching for frequently accessed data
- Set appropriate timeouts for your use case
- Use connection pooling for high-volume operations
- Monitor memory usage and adjust cache sizes
- Implement proper rate limiting

**✅ Maintenance Best Practices:**
- Keep the MCP client updated regularly
- Monitor logs for errors and performance issues
- Test configuration changes in development first
- Document your configuration choices
- Set up monitoring and alerting for production

**✅ Development Best Practices:**
- Use separate configurations for dev/staging/prod
- Version control your configuration templates
- Use descriptive server names for multi-marketplace setups
- Enable debug logging during development
- Test with sandbox mode before production deployment

**❌ Common Mistakes to Avoid:**
- Don't share configuration files with credentials
- Don't use production credentials in development
- Don't ignore log files and error messages
- Don't skip configuration validation steps
- Don't use overly aggressive rate limiting in development

### 🚀 Transport Configuration Examples

The Amazon Seller MCP Client supports multiple transport mechanisms for communication between Claude Desktop and the MCP server. Choose the transport method that best fits your deployment architecture and security requirements.

#### **Standard I/O (stdio) Transport Configuration**

The default and most common transport method, using standard input/output streams for communication:

```json
{
  "mcpServers": {
    "amazon-seller-stdio": {
      "command": "npx",
      "args": ["amazon-seller-mcp-client"],
      "transport": {
        "type": "stdio"
      },
      "env": {
        "AMAZON_CLIENT_ID": "amzn1.application-oa2-client.xxxxx",
        "AMAZON_CLIENT_SECRET": "your_client_secret",
        "AMAZON_REFRESH_TOKEN": "Atzr|IwEBIxxxxx",
        "AMAZON_MARKETPLACE_ID": "ATVPDKIKX0DER",
        "TRANSPORT_MODE": "stdio",
        "STDIO_BUFFER_SIZE": "8192",
        "STDIO_TIMEOUT": "30000"
      }
    }
  }
}
```

**stdio Transport Benefits:**
- ✅ Simple and reliable communication
- ✅ No network configuration required
- ✅ Built-in process management
- ✅ Automatic cleanup on disconnect
- ✅ Low latency for local operations

**stdio Configuration Options:**
- `STDIO_BUFFER_SIZE`: Buffer size for I/O operations (default: 8192 bytes)
- `STDIO_TIMEOUT`: Timeout for stdio operations (default: 30000ms)
- `STDIO_ENCODING`: Character encoding (default: utf8)

#### **HTTP Transport Configuration**

HTTP-based transport for remote server deployments and load balancing:

```json
{
  "mcpServers": {
    "amazon-seller-http": {
      "transport": {
        "type": "http",
        "host": "localhost",
        "port": 8080,
        "path": "/mcp",
        "headers": {
          "Authorization": "Bearer your-api-token",
          "Content-Type": "application/json",
          "User-Agent": "Claude-Desktop/1.0"
        }
      },
      "env": {
        "HTTP_SERVER_MODE": "true",
        "HTTP_HOST": "0.0.0.0",
        "HTTP_PORT": "8080",
        "HTTP_PATH": "/mcp",
        "CORS_ENABLED": "true",
        "CORS_ORIGINS": "https://claude.ai",
        "SSL_ENABLED": "false",
        "REQUEST_TIMEOUT": "60000",
        "KEEP_ALIVE": "true"
      }
    }
  }
}
```

**HTTP Transport Benefits:**
- ✅ Remote server deployment
- ✅ Load balancing and scaling
- ✅ Standard HTTP protocols
- ✅ Easy monitoring and logging
- ✅ Firewall-friendly

**HTTP Configuration Options:**
- `HTTP_HOST`: Server bind address (0.0.0.0 for all interfaces)
- `HTTP_PORT`: Server port number
- `HTTP_PATH`: API endpoint path
- `CORS_ENABLED`: Enable Cross-Origin Resource Sharing
- `CORS_ORIGINS`: Allowed CORS origins
- `SSL_ENABLED`: Enable HTTPS (requires certificates)

#### **HTTPS Transport Configuration (Secure)**

Secure HTTP transport with SSL/TLS encryption:

```json
{
  "mcpServers": {
    "amazon-seller-https": {
      "transport": {
        "type": "http",
        "host": "your-domain.com",
        "port": 443,
        "path": "/mcp",
        "secure": true,
        "headers": {
          "Authorization": "Bearer your-secure-token",
          "Content-Type": "application/json"
        },
        "tls": {
          "rejectUnauthorized": true,
          "ca": "/path/to/ca-cert.pem",
          "cert": "/path/to/client-cert.pem",
          "key": "/path/to/client-key.pem"
        }
      },
      "env": {
        "HTTPS_SERVER_MODE": "true",
        "SSL_ENABLED": "true",
        "SSL_CERT_PATH": "/path/to/server-cert.pem",
        "SSL_KEY_PATH": "/path/to/server-key.pem",
        "SSL_CA_PATH": "/path/to/ca-cert.pem",
        "TLS_VERSION": "TLSv1.3",
        "CIPHER_SUITES": "ECDHE-RSA-AES256-GCM-SHA384",
        "VERIFY_CLIENT_CERT": "true"
      }
    }
  }
}
```

**HTTPS Transport Benefits:**
- ✅ End-to-end encryption
- ✅ Certificate-based authentication
- ✅ Enterprise security compliance
- ✅ Protection against MITM attacks
- ✅ Audit trail capabilities

#### **WebSocket Transport Configuration**

Real-time bidirectional communication using WebSockets:

```json
{
  "mcpServers": {
    "amazon-seller-websocket": {
      "transport": {
        "type": "websocket",
        "url": "ws://localhost:8080/mcp",
        "protocols": ["mcp-v1"],
        "headers": {
          "Authorization": "Bearer your-websocket-token"
        },
        "options": {
          "pingInterval": 30000,
          "pongTimeout": 5000,
          "reconnectInterval": 5000,
          "maxReconnectAttempts": 10
        }
      },
      "env": {
        "WEBSOCKET_SERVER_MODE": "true",
        "WS_HOST": "0.0.0.0",
        "WS_PORT": "8080",
        "WS_PATH": "/mcp",
        "WS_PING_INTERVAL": "30000",
        "WS_PONG_TIMEOUT": "5000",
        "WS_MAX_PAYLOAD": "1048576",
        "WS_COMPRESSION": "true"
      }
    }
  }
}
```

**WebSocket Transport Benefits:**
- ✅ Real-time bidirectional communication
- ✅ Lower latency than HTTP polling
- ✅ Efficient for frequent updates
- ✅ Built-in connection management
- ✅ Support for streaming data

#### **Environment-Specific Transport Configurations**

**Development Environment (stdio with debugging):**
```json
{
  "mcpServers": {
    "amazon-seller-dev": {
      "command": "npx",
      "args": ["amazon-seller-mcp-client", "--dev-mode"],
      "transport": {
        "type": "stdio"
      },
      "env": {
        "NODE_ENV": "development",
        "TRANSPORT_MODE": "stdio",
        "DEBUG_TRANSPORT": "true",
        "LOG_TRANSPORT_EVENTS": "true",
        "STDIO_BUFFER_SIZE": "16384",
        "DEVELOPMENT_MODE": "true"
      }
    }
  }
}
```

**Staging Environment (HTTP with monitoring):**
```json
{
  "mcpServers": {
    "amazon-seller-staging": {
      "transport": {
        "type": "http",
        "host": "staging-api.yourcompany.com",
        "port": 8080,
        "path": "/mcp/v1",
        "headers": {
          "Authorization": "Bearer staging-token",
          "X-Environment": "staging"
        }
      },
      "env": {
        "NODE_ENV": "staging",
        "HTTP_SERVER_MODE": "true",
        "MONITORING_ENABLED": "true",
        "METRICS_ENDPOINT": "/metrics",
        "HEALTH_CHECK_ENDPOINT": "/health",
        "REQUEST_LOGGING": "true"
      }
    }
  }
}
```

**Production Environment (HTTPS with high availability):**
```json
{
  "mcpServers": {
    "amazon-seller-prod": {
      "transport": {
        "type": "http",
        "host": "api.yourcompany.com",
        "port": 443,
        "path": "/mcp/v1",
        "secure": true,
        "headers": {
          "Authorization": "Bearer production-token",
          "X-Environment": "production"
        },
        "tls": {
          "rejectUnauthorized": true
        }
      },
      "env": {
        "NODE_ENV": "production",
        "HTTPS_SERVER_MODE": "true",
        "SSL_ENABLED": "true",
        "LOAD_BALANCER_ENABLED": "true",
        "CIRCUIT_BREAKER_ENABLED": "true",
        "RATE_LIMITING_STRICT": "true",
        "AUDIT_LOGGING": "true"
      }
    }
  }
}
```

#### **Load Balanced Transport Configuration**

For high-availability deployments with multiple server instances:

```json
{
  "mcpServers": {
    "amazon-seller-ha": {
      "transport": {
        "type": "http",
        "loadBalancer": {
          "strategy": "round-robin",
          "healthCheck": {
            "enabled": true,
            "interval": 30000,
            "timeout": 5000,
            "path": "/health"
          },
          "servers": [
            {
              "host": "mcp-server-1.yourcompany.com",
              "port": 8080,
              "weight": 1
            },
            {
              "host": "mcp-server-2.yourcompany.com",
              "port": 8080,
              "weight": 1
            },
            {
              "host": "mcp-server-3.yourcompany.com",
              "port": 8080,
              "weight": 2
            }
          ]
        }
      },
      "env": {
        "LOAD_BALANCER_MODE": "true",
        "FAILOVER_ENABLED": "true",
        "STICKY_SESSIONS": "false",
        "CONNECTION_POOLING": "true",
        "POOL_SIZE": "20"
      }
    }
  }
}
```

#### **Proxy and Firewall Configuration**

For environments with corporate proxies and firewalls:

```json
{
  "mcpServers": {
    "amazon-seller-proxy": {
      "transport": {
        "type": "http",
        "host": "internal-mcp-server.corp.com",
        "port": 8080,
        "proxy": {
          "host": "corporate-proxy.corp.com",
          "port": 3128,
          "auth": {
            "username": "proxy-user",
            "password": "proxy-password"
          }
        }
      },
      "env": {
        "HTTP_PROXY": "http://corporate-proxy.corp.com:3128",
        "HTTPS_PROXY": "http://corporate-proxy.corp.com:3128",
        "NO_PROXY": "localhost,127.0.0.1,.corp.com",
        "PROXY_AUTH_ENABLED": "true",
        "FIREWALL_FRIENDLY": "true"
      }
    }
  }
}
```

#### **Transport Performance Optimization**

**High-Throughput Configuration:**
```json
{
  "mcpServers": {
    "amazon-seller-performance": {
      "transport": {
        "type": "http",
        "host": "localhost",
        "port": 8080,
        "keepAlive": true,
        "maxSockets": 50,
        "timeout": 60000
      },
      "env": {
        "TRANSPORT_OPTIMIZATION": "high-throughput",
        "CONNECTION_POOL_SIZE": "50",
        "KEEP_ALIVE_TIMEOUT": "60000",
        "TCP_NO_DELAY": "true",
        "SOCKET_REUSE": "true",
        "COMPRESSION_ENABLED": "true"
      }
    }
  }
}
```

**Low-Latency Configuration:**
```json
{
  "mcpServers": {
    "amazon-seller-lowlatency": {
      "transport": {
        "type": "websocket",
        "url": "ws://localhost:8080/mcp",
        "options": {
          "pingInterval": 10000,
          "pongTimeout": 2000,
          "maxPayload": 65536
        }
      },
      "env": {
        "TRANSPORT_OPTIMIZATION": "low-latency",
        "WS_PING_INTERVAL": "10000",
        "WS_PONG_TIMEOUT": "2000",
        "BUFFER_SIZE": "65536",
        "NAGLE_DISABLED": "true"
      }
    }
  }
}
```

#### **Transport Security Best Practices**

**✅ Security Recommendations:**
- Always use HTTPS in production environments
- Implement proper authentication tokens
- Enable certificate validation
- Use strong cipher suites
- Implement rate limiting
- Enable audit logging
- Rotate authentication tokens regularly

**✅ Performance Recommendations:**
- Use connection pooling for HTTP transport
- Enable compression for large payloads
- Implement proper timeout values
- Use keep-alive connections
- Monitor connection health
- Implement circuit breakers for resilience

**✅ Monitoring Recommendations:**
- Log all transport events
- Monitor connection metrics
- Set up health checks
- Track response times
- Monitor error rates
- Implement alerting for failures

---

## 🛠️ Available Tools & Resources

Comprehensive MCP tools and resources for Amazon seller operations.

### 📋 MCP Tools

| Tool Category | Available Tools | Description |
|---------------|-----------------|-------------|
| **Catalog** | `search_products`, `get_product_details`, `get_categories` | Product catalog operations |
| **Listings** | `create_listing`, `update_listing`, `delete_listing`, `get_listings` | Product listing management |
| **Inventory** | `get_inventory`, `update_inventory`, `get_inventory_summary` | Inventory tracking and updates |
| **Orders** | `get_orders`, `get_order_details`, `update_order_status` | Order processing and management |
| **Reports** | `request_report`, `get_report_status`, `download_report` | Analytics and reporting |
| **AI Tools** | `generate-product-description`, `optimize-listing` | AI-powered prompt generation for external AI assistants |

### 📚 MCP Resources

| Resource Type | URI Pattern | Description |
|---------------|-------------|-------------|
| **Products** | `amazon://products/{asin}` | Product information and details |
| **Listings** | `amazon://listings/{seller-sku}` | Seller listing data |
| **Orders** | `amazon://orders/{order-id}` | Order information |
| **Reports** | `amazon://reports/{report-id}` | Generated reports |
| **Inventory** | `amazon://inventory/{sku}` | Inventory levels and status |

---

## 💡 Usage Examples

Practical examples for common Amazon seller operations.

### Product Listing Management

```typescript
// Create a new product listing
const listing = await mcpClient.call('create_listing', {
  sku: 'MY-PRODUCT-001',
  productType: 'PRODUCT',
  attributes: {
    title: 'Premium Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    price: 99.99,
    quantity: 100
  }
});
```

### AI-Assisted Product Descriptions

```typescript
// Generate optimized product description prompt
const descriptionPrompt = await mcpClient.call('generate-product-description', {
  productTitle: 'Wireless Bluetooth Headphones',
  keyFeatures: ['Noise Cancellation', '30-hour Battery', 'Premium Sound'],
  targetAudience: 'Music enthusiasts and professionals'
});
```

### Inventory Monitoring

```typescript
// Get current inventory levels
const inventory = await mcpClient.call('get_inventory', {
  skus: ['SKU-001', 'SKU-002', 'SKU-003'],
  marketplace: 'ATVPDKIKX0DER'
});
```

---

## 🔐 Authentication & Security

Secure setup and credential management for Amazon SP-API integration.

### Setting Up Amazon SP-API Credentials

1. **Create Developer Account** - Register at [Amazon Developer Console](https://developer.amazon.com/)
2. **Create Application** - Set up your SP-API application
3. **Generate Credentials** - Obtain Client ID, Client Secret, and Refresh Token
4. **Configure Permissions** - Set required API permissions

### Security Best Practices

- ✅ Use environment variables for credentials
- ✅ Implement credential rotation
- ✅ Enable audit logging
- ✅ Use least-privilege access
- ❌ Never commit credentials to version control
- ❌ Don't share credentials across environments

### Environment Configuration

```bash
# Development
export AMAZON_CLIENT_ID="amzn1.application-oa2-client.dev"
export AMAZON_CLIENT_SECRET="dev_secret"
export AMAZON_REFRESH_TOKEN="dev_refresh_token"

# Production
export AMAZON_CLIENT_ID="amzn1.application-oa2-client.prod"
export AMAZON_CLIENT_SECRET="prod_secret"
export AMAZON_REFRESH_TOKEN="prod_refresh_token"
```

---

## 🔧 Troubleshooting

Common issues and solutions for smooth operation.

### Quick Diagnostics

```bash
# Check system requirements
amazon-seller-mcp-client --system-check

# Validate credentials
amazon-seller-mcp-client --auth-test

# Test API connectivity
amazon-seller-mcp-client --connection-test
```

### Common Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Auth Failure** | 401/403 errors | Verify credentials and permissions |
| **Rate Limiting** | 429 errors | Implement exponential backoff |
| **Network Issues** | Timeout errors | Check firewall and proxy settings |
| **Invalid SKU** | 400 errors | Validate SKU format and existence |

### Debug Logging

```bash
# Enable debug mode
export LOG_LEVEL=debug
amazon-seller-mcp-client

# View detailed logs
tail -f ~/.amazon-seller-mcp/logs/debug.log
```

---

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-username/amazon-seller-mcp-client.git
cd amazon-seller-mcp-client

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev
```

### Contribution Guidelines

- 📝 Follow TypeScript best practices
- ✅ Write comprehensive tests
- 📚 Update documentation
- 🔍 Submit detailed pull requests

### Architecture Overview

The Amazon Seller MCP Client follows a modular architecture designed for extensibility and maintainability:

#### Core Components

```
src/
├── server/           # MCP Server Implementation
│   ├── server.ts     # Main MCP server with transport handling
│   ├── tools.ts      # Tool registration and management
│   ├── resources.ts  # Resource registration and management
│   └── notifications.ts # Real-time notification system
├── api/              # Amazon SP-API Client Layer
│   ├── base-client.ts    # Base HTTP client with auth
│   ├── catalog-client.ts # Product catalog operations
│   ├── listings-client.ts # Listing management
│   ├── inventory-client.ts # Inventory operations
│   └── orders-client.ts   # Order management
├── tools/            # MCP Tool Implementations
│   ├── catalog-tools.ts   # Product search and lookup
│   ├── listings-tools.ts  # Listing CRUD operations
│   ├── inventory-tools.ts # Inventory management
│   ├── orders-tools.ts    # Order processing
│   └── ai-tools.ts       # AI-assisted operations
├── resources/        # MCP Resource Providers
│   ├── catalog/      # Product and category resources
│   ├── listings/     # Listing data resources
│   ├── inventory/    # Inventory status resources
│   └── orders/       # Order data resources
├── auth/             # Authentication Layer
│   ├── amazon-auth.ts     # OAuth token management
│   └── credential-manager.ts # Credential storage
└── utils/            # Shared Utilities
    ├── cache-manager.ts   # Response caching
    └── connection-pool.ts # HTTP connection pooling
```

#### Data Flow Architecture

```mermaid
graph TB
    A[AI Agent/Claude] --> B[MCP Protocol]
    B --> C[MCP Server]
    C --> D[Tool Registry]
    C --> E[Resource Registry]
    D --> F[Amazon SP-API Client]
    E --> F
    F --> G[Authentication Layer]
    F --> H[Cache Manager]
    F --> I[Connection Pool]
    G --> J[Amazon SP-API]
    H --> K[Local Cache]
    I --> J
```

#### Extension Points for New Features

**1. Adding New API Endpoints**
- Create new client in `src/api/` extending `BaseClient`
- Implement authentication and error handling
- Add rate limiting and caching as needed

**2. Creating New MCP Tools**
- Add tool implementation in `src/tools/`
- Register tool in `src/server/tools.ts`
- Follow the tool handler pattern with proper validation

**3. Adding New Resources**
- Create resource provider in `src/resources/`
- Implement resource templates and data fetching
- Register in `src/server/resources.ts`

**4. Extending Authentication**
- Modify `src/auth/amazon-auth.ts` for new auth flows
- Update credential management in `credential-manager.ts`
- Ensure backward compatibility

#### API Design Guidelines

**Tool Implementation Standards:**
```typescript
// Tool handler signature
export async function handleToolName(
  args: ToolArgs,
  context: ToolContext
): Promise<ToolResult> {
  // 1. Validate input arguments
  const validatedArgs = ToolArgsSchema.parse(args);
  
  // 2. Check authentication
  await context.auth.ensureValidToken();
  
  // 3. Execute API operation with error handling
  try {
    const result = await context.apiClient.operation(validatedArgs);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**Resource Provider Standards:**
```typescript
// Resource provider signature
export function registerResourceName(server: McpServer) {
  server.setResourceTemplate(
    'resource://amazon/resource-name/{id}',
    {
      name: 'Resource Name',
      description: 'Resource description',
      mimeType: 'application/json'
    },
    async (uri: string) => {
      // 1. Parse URI parameters
      const { id } = parseResourceUri(uri);
      
      // 2. Fetch data with caching
      const data = await fetchWithCache(`resource-${id}`, () =>
        apiClient.getResource(id)
      );
      
      // 3. Return formatted resource
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2)
      };
    }
  );
}
```

**Error Handling Patterns:**
- Use structured error responses with error codes
- Implement retry logic with exponential backoff
- Log errors with appropriate detail levels
- Provide user-friendly error messages

**Performance Guidelines:**
- Implement caching for frequently accessed data
- Use connection pooling for HTTP requests
- Batch API calls when possible
- Monitor and optimize memory usage

**Testing Requirements:**
- Unit tests for all tool handlers
- Integration tests for API clients
- Mock Amazon SP-API responses for testing
- Performance tests for high-load scenarios

---

## 💬 Support

### Community & Help

- 💬 **Discord Community** - [Join our Discord](https://discord.gg/amazon-seller-mcp)
- 📧 **Email Support** - support@amazon-seller-mcp.com
- 🐛 **Bug Reports** - [GitHub Issues](https://github.com/your-username/amazon-seller-mcp-client/issues)
- 📖 **Documentation** - [Full Documentation](https://docs.amazon-seller-mcp.com)

### Recent Updates & Improvements

#### Version 0.1.0 - Latest Improvements

**🔧 Core Infrastructure Fixes:**
- ✅ Fixed BaseApiClient axios initialization issues
- ✅ Improved MCP server compatibility with proper close method handling
- ✅ Enhanced error handling and type safety across the codebase

**📡 Notification System Enhancements:**
- ✅ Refactored notification system to use MCP's `sendLoggingMessage` for better compatibility
- ✅ Improved async notification handling with proper event emission
- ✅ Enhanced notification formatting and delivery reliability

**🤖 AI Tools Improvements:**
- ✅ AI tools now generate structured prompts for use with external AI assistants
- ✅ Updated `generate-product-description` and `optimize-listing` tools
- ✅ Better error handling and user guidance for AI-assisted operations

**🧪 Test Coverage Improvements:**
- ✅ Significantly improved test reliability (64.4% pass rate, up from 59.7%)
- ✅ Fixed 17+ failing tests across multiple components
- ✅ Better mocking strategies and async test handling

### Project Status

- **Version:** 0.1.0
- **Status:** Active Development
- **License:** MIT
- **Node.js:** ≥18.0.0
- **Test Coverage:** 64.4% (232 passing tests)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ for the Amazon seller community**

[⭐ Star us on GitHub](https://github.com/your-username/amazon-seller-mcp-client) • [🐛 Report Bug](https://github.com/your-username/amazon-seller-mcp-client/issues) • [💡 Request Feature](https://github.com/your-username/amazon-seller-mcp-client/issues)

</div>