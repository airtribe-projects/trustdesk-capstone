import React, { useState } from 'react';
import EvaluationCard from '../components/EvaluationCard';
import { runEvaluation } from '../api/api';

const EvaluationPage = ({ addToast }) => {
  const [evalData, setEvalData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRunEvaluation = async () => {
    setIsLoading(true);
    try {
      const res = await runEvaluation();
      setEvalData(res);
      addToast({
        type: 'success',
        title: 'Evaluation Finished',
        message: `Benchmarking complete. Overall Accuracy: ${res.accuracy}%`
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Evaluation Failed',
        message: err.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-scroll-container">
      <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '2.5rem' }}>
        <EvaluationCard
          evalData={evalData}
          onRunEvaluation={handleRunEvaluation}
          isLoading={isLoading}
          compact={false}
        />
      </div>
    </div>
  );
};

export default EvaluationPage;
