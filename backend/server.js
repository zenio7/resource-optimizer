
const express = require('express');
const dotenv = require('dotenv');
const { DefaultAzureCredential } = require('@azure/identity');
const { AdvisorManagementClient } = require('@azure/arm-advisor');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.get('/api/recommendations', async (req, res) => {
  try {
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
    if (!subscriptionId) {
      return res.status(400).json({ message: 'AZURE_SUBSCRIPTION_ID is not set in the .env file.' });
    }

    // Use DefaultAzureCredential for authentication.
    // It will try multiple credential types (e.g., Environment, Managed Identity)
    const credential = new DefaultAzureCredential();
    const advisorClient = new AdvisorManagementClient(credential, subscriptionId);

    const recommendations = [];
    // Fetch all recommendations and filter for VMs
    for await (const recommendation of advisorClient.recommendations.list()) {
      if (recommendation.resourceMetadata.resourceType === 'Microsoft.Compute/virtualMachines') {
        recommendations.push({
          id: recommendation.id,
          category: recommendation.category,
          impact: recommendation.impact,
          impactedField: recommendation.impactedField,
          impactedValue: recommendation.impactedValue,
          lastUpdated: recommendation.lastUpdated,
          description: recommendation.shortDescription.problem,
          solution: recommendation.shortDescription.solution,
          resourceId: recommendation.resourceMetadata.resourceId,
        });
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
