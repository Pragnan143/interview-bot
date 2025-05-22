import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../context/ToastContext';
import { Plus, X } from 'lucide-react';

const CreateTest: React.FC = () => {
  const [title, setTitle] = useState('');
  const [role, setRole] = useState('');
  const [duration, setDuration] = useState(45);
  const [vivaEnabled, setVivaEnabled] = useState(true);
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleAddTopic = () => {
    const trimmed = topic.trim();
    if (trimmed && !topics.includes(trimmed)) {
      setTopics((prev) => [...prev, trimmed]);
      setTopic('');
    }
  };

  const handleRemoveTopic = (t: string) => {
    setTopics((prev) => prev.filter((topic) => topic !== t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !role.trim() || topics.length === 0) {
      addToast('Please fill all required fields.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await addDoc(collection(db, 'tests'), {
        title: title.trim(),
        role: role.trim(),
        duration,
        vivaEnabled,
        topics,
        createdAt: new Date().toISOString(),
      });
      addToast('Test created successfully!', 'success');
      navigate('/admin/tests');
    } catch (err) {
      console.error(err);
      addToast('Failed to create test.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTopicChips = () =>
    topics.map((t, idx) => (
      <span
        key={idx}
        className="inline-flex items-center px-3 py-1 rounded-full bg-primary-100 text-primary-800 text-sm font-medium"
      >
        {t}
        <button
          type="button"
          onClick={() => handleRemoveTopic(t)}
          className="ml-2 bg-primary-200 hover:bg-primary-300 rounded-full p-1 text-primary-700 focus:outline-none"
          aria-label={`Remove ${t}`}
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    ));

  return (
    <AdminLayout title="Create Test">
      <div className="bg-white shadow sm:rounded-lg p-6 animate-fade-in">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-gray-700">
              Test Title <span className="text-red-600">*</span>
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full border rounded-md px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., React Developer Test"
            />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-semibold text-gray-700">
              Role <span className="text-red-600">*</span>
            </label>
            <input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full border rounded-md px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Frontend Developer"
            />
          </div>

          {/* Topics */}
          <div>
            <label htmlFor="topics" className="block text-sm font-semibold text-gray-700">
              Topics <span className="text-red-600">*</span>
            </label>
            <div className="flex gap-2 mt-1">
              <input
                id="topics"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTopic();
                  }
                }}
                placeholder="Type and press Enter"
                className="flex-1 border rounded-md px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                type="button"
                onClick={handleAddTopic}
                className="bg-primary-600 text-white px-3 py-2 rounded-md hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">{renderTopicChips()}</div>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-semibold text-gray-700">
              Duration (minutes)
            </label>
            <input
              type="number"
              id="duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min={10}
              max={180}
              className="mt-1 w-full border rounded-md px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Viva */}
          <div className="flex items-center space-x-3">
            <input
              id="vivaEnabled"
              type="checkbox"
              checked={vivaEnabled}
              onChange={(e) => setVivaEnabled(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="vivaEnabled" className="text-sm text-gray-700">
              Enable continuous viva questioning
            </label>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/tests')}
              className="px-4 py-2 border rounded-md bg-white text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-md text-white font-medium bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Creating...
                </div>
              ) : (
                'Create Test'
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default CreateTest;
