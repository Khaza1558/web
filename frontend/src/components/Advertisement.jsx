import React from 'react';

const Advertisement = ({ imageUrl, linkUrl, altText = 'Advertisement' }) => (
  <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
    <div className="bg-white rounded-3xl shadow-2xl border-2 border-blue-400 flex items-center justify-center w-full h-full p-8 transition hover:scale-105">
      <img src={imageUrl} alt={altText} className="max-h-64 max-w-full object-contain mx-auto" />
    </div>
  </a>
);

export default Advertisement; 
