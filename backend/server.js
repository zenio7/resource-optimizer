
const express = require('express');
const dotenv = require('dotenv');
const { ClientSecretCredential } = require('@azure/identity');
const { AdvisorManagementClient } = require('@azure/arm-advisor');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.get('/api/recommendations', async (req, res) => {
  try {
    console.log('Received a request to /api/recommendations');
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!subscriptionId || !tenantId || !clientId || !clientSecret) {
      return res.status(400).json({ message: 'Azure credentials are not set in the .env file.' });
    }

    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const advisorClient = new AdvisorManagementClient(credential, subscriptionId);

    const recommendations = [];
    const processedIds = new Set();
    const filter = "(Category eq 'Cost' or Category eq 'Performance')";

    for await (const recommendation of advisorClient.recommendations.list({ filter })) {
      if (recommendation.extendedProperties && !processedIds.has(recommendation.id)) {
        let details = {};
        let resourceName = recommendation.impactedValue;

        // Check if it's a Reserved Instance recommendation
        if (recommendation.extendedProperties.reservedResourceType === 'virtualmachines') {
          resourceName = `VM SKU: ${recommendation.extendedProperties.displaySKU}`;
          details = {
            Term: recommendation.extendedProperties.term === 'P1Y' ? '1 Year' : '3 Years',
            Quantity: recommendation.extendedProperties.displayQty,
          };
        } 
        // Check if it's a Right-Sizing (SKU change) recommendation
        else if (recommendation.extendedProperties.currentSku && recommendation.extendedProperties.targetSku) {
          details = {
            'Current SKU': recommendation.extendedProperties.currentSku,
            'Target SKU': recommendation.extendedProperties.targetSku,
            'CPU Usage (p95)': `${recommendation.extendedProperties.MaxCpuP95}%`,
            'Memory Usage (p95)': `${recommendation.extendedProperties.MaxMemoryP95}%`,
          };
        }

        recommendations.push({
          id: recommendation.id,
          category: recommendation.category,
          resourceName: resourceName,
          recommendation: recommendation.shortDescription.problem,
          details: details,
          savings: recommendation.extendedProperties.annualSavingsAmount ? `${recommendation.extendedProperties.annualSavingsAmount} ${recommendation.extendedProperties.savingsCurrency}` : 'N/A',
          lastUpdated: recommendation.lastUpdated,
        });
        processedIds.add(recommendation.id);
      }
    }
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching Azure Advisor recommendations:', error);
    res.status(500).json({ message: 'Failed to fetch recommendations from Azure. Check server logs for details.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
