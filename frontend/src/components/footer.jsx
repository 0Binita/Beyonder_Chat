import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-base-200 border-t border-base-300 py-6 mt-16">
      <div className="max-w-7xl mx-auto px-6 flex flex-col justify items-center text-sm text-base-content/70">
        <p className="mb-2 md:mb-0">
          &copy; {new Date().getFullYear()}. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
