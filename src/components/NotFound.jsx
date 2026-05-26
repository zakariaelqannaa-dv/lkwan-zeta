import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-[#e7e9ea] mb-2">404</h1>
        <p className="text-base text-[#71767b] mb-8">This page doesn't exist.</p>
        <Link
          to="/"
          className="inline-block bg-[#1d9bf0] text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-[#1a8cd8] transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
