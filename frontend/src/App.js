import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch('/api/recommendations');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setRecommendations(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (loading) {
    return <div className="App"><h1>Loading...</h1></div>;
  }

  if (error) {
    return <div className="App"><h1>Error: {error}</h1></div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Azure VM Recommendations</h1>
      </header>
      <main>
        {recommendations.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Resource</th>
                <th>Recommendation</th>
                <th>Details</th>
                <th>Est. Annual Savings</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((rec) => (
                <tr key={rec.id}>
                  <td>{rec.category}</td>
                  <td>{rec.resourceName}</td>
                  <td>{rec.recommendation}</td>
                  <td>
                    {Object.entries(rec.details).map(([key, value]) => (
                      <div key={key}><strong>{key}:</strong> {value}</div>
                    ))}
                  </td>
                  <td className="savings-cell">{rec.savings}</td>
                  <td>{new Date(rec.lastUpdated).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No recommendations found.</p>
        )}
      </main>
    </div>
  );
}

export default App;