import React, { useState } from 'react';
import { BookOpen, Search, FileText, Tag, Hash } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const KnowledgeCard = ({
  results = [],
  onSearch,
  isLoading,
  initialQuery = ''
}) => {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <BookOpen className="card-title-icon" size={20} />
            <span>Knowledge Base Search</span>
          </div>
          <span className="badge badge-primary">
            RAG Grounding Store
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }}
            />
            <input
              type="text"
              className="search-input"
              style={{ width: '100%', paddingLeft: '2.75rem', paddingRight: '1rem', fontSize: '0.95rem' }}
              placeholder="Search policy articles, return guides, warranty terms (e.g., 'return window', 'shipping')..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? <LoadingSpinner size="16px" /> : 'Search Policy'}
          </button>
        </form>
      </div>

      {/* Results Listing */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {isLoading ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <LoadingSpinner size="24px" message="Retrieving knowledge documents from vector index..." />
          </div>
        ) : results.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--slate-500)' }}>
            <FileText size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p>No knowledge base documents match your query.</p>
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
              Try searching for general keywords like "return", "refund", "shipping", or "warranty".
            </span>
          </div>
        ) : (
          results.map((doc, idx) => (
            <div key={doc.document_id || idx} className="card">
              <div className="card-header" style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem' }}>
                <div className="card-title" style={{ fontSize: '1.05rem' }}>
                  <FileText className="card-title-icon" size={16} />
                  <span>{doc.title}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="badge badge-info">
                    <Tag size={12} />
                    {doc.category || 'Policy'}
                  </span>
                  <span className="citation-tag">
                    <Hash size={10} />
                    {doc.document_id}
                  </span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--slate-50)',
                  border: '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  color: 'var(--slate-800)',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {doc.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default KnowledgeCard;
