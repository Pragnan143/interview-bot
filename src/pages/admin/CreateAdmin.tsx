import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const CreateAdmin: React.FC = () => {
  const { createUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Reset error before attempting to create
    setLoading(true);

    try {
      // Create the admin user with 'admin' role
      await createUser(email, password, displayName, 'admin');
      alert('Admin account created successfully.');
    } catch (err) {
      setError('Error creating admin: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Create Admin</h2>
        
        {/* Input Fields */}
        <input
          type="email"
          placeholder="Admin Email"
          className="w-full p-2 border mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        
        <input
          type="text"
          placeholder="Display Name"
          className="w-full p-2 border mb-4"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        
        {/* Error message */}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {/* Submit Button */}
        <button
          onClick={handleCreateAdmin}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
          disabled={loading}
        >
          {loading ? 'Creating Admin...' : 'Create Admin'}
        </button>
      </div>
    </div>
  );
};

export default CreateAdmin;
