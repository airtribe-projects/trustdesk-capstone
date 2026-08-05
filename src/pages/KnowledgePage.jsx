import React, { useState, useEffect } from 'react';
import KnowledgeCard from '../components/KnowledgeCard';
import { searchKnowledge } from '../api/api';

const KnowledgePage = ({ addToast, initialQuery = '' }) => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query) => {
    setIsLoading(true);
    try {
      const docs = await searchKnowledge(query);
      setResults(docs);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Search Error',
        message: err.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Default search on load
    handleSearch(initialQuery || 'return policy');
  }, [initialQuery]);

  return (
    <div className="page-scroll-container">
      <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '2.5rem' }}>
        <KnowledgeCard
          results={results}
          onSearch={handleSearch}
          isLoading={isLoading}
          initialQuery={initialQuery || 'return policy'}
        />
      </div>
    </div>
  );
};

export default KnowledgePage;
