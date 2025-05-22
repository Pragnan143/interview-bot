import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AdminLayout from '../../components/AdminLayout';
import { Plus, Users as UsersIcon, AtSign, User, KeyRound } from 'lucide-react';

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  createdAt: string;
}

interface Test {
  id: string;
  title: string;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<string>('');
  
  // Form states
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createUser } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'user'));
        const querySnapshot = await getDocs(q);
        
        const usersList: UserData[] = [];
        querySnapshot.forEach((doc) => {
          usersList.push({ uid: doc.id, ...doc.data() } as UserData);
        });
        
        setUsers(usersList);
        
        // Fetch tests for assignment
        const testsSnapshot = await getDocs(collection(db, 'tests'));
        const testsList: Test[] = [];
        testsSnapshot.forEach((doc) => {
          testsList.push({ id: doc.id, title: doc.data().title });
        });
        
        setTests(testsList);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        addToast('Failed to load users', 'error');
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [addToast]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail || !newUserName || !newUserPassword) {
      addToast('Please fill in all required fields', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await createUser(newUserEmail, newUserPassword, newUserName, 'user');
      
      addToast('User created successfully', 'success');
      
      // Reset form and refresh data
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      setShowCreateForm(false);
      
      // Refresh user list
      const q = query(collection(db, 'users'), where('role', '==', 'user'));
      const querySnapshot = await getDocs(q);
      
      const usersList: UserData[] = [];
      querySnapshot.forEach((doc) => {
        usersList.push({ uid: doc.id, ...doc.data() } as UserData);
      });
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error creating user:', error);
      addToast('Failed to create user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignTest = async (userId: string) => {
    if (!selectedTest) {
      addToast('Please select a test', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Check if user already has this test assigned
      const assignmentsQuery = query(collection(db, 'testAssignments'));
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      
      const existingAssignment = assignmentsSnapshot.docs.find(
        doc => doc.data().userId === userId && doc.data().testId === selectedTest
      );
      
      if (existingAssignment) {
        addToast('This test is already assigned to this user', 'warning');
        setShowAssignForm(null);
        setSelectedTest('');
        setIsSubmitting(false);
        return;
      }
      
      // Create assignment
      await addDoc(collection(db, 'testAssignments'), {
        userId,
        testId: selectedTest,
        status: 'assigned',
        assignedAt: new Date().toISOString(),
        completedAt: null,
        results: null
      });
      
      addToast('Test assigned successfully', 'success');
      setShowAssignForm(null);
      setSelectedTest('');
    } catch (error) {
      console.error('Error assigning test:', error);
      addToast('Failed to assign test', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Users">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Manage Users</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create User
        </button>
      </div>
      
      {showCreateForm && (
        <div className="mb-6 bg-white shadow sm:rounded-lg animate-slide-up">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Create New User</h3>
            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address <span className="text-error-600">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <AtSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    placeholder="user@example.com"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name <span className="text-error-600">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password <span className="text-error-600">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    placeholder="••••••••"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Password must be at least 6 characters
                </p>
              </div>
              
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                    isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first user.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md animate-fade-in">
          <ul className="divide-y divide-gray-200">
            {users.map((user) => (
              <li key={user.uid}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition duration-150">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-lg font-semibold text-primary-600">{user.displayName}</p>
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <AtSign className="h-4 w-4 mr-1" />
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Created: {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div>
                      {showAssignForm === user.uid ? (
                        <div className="bg-gray-50 p-3 rounded-md shadow-sm animate-fade-in">
                          <div className="flex items-end space-x-2">
                            <div className="flex-1">
                              <label htmlFor="selectTest" className="block text-xs font-medium text-gray-700 mb-1">
                                Select Test
                              </label>
                              <select
                                id="selectTest"
                                value={selectedTest}
                                onChange={(e) => setSelectedTest(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                              >
                                <option value="">Select a test...</option>
                                {tests.map((test) => (
                                  <option key={test.id} value={test.id}>
                                    {test.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              onClick={() => handleAssignTest(user.uid)}
                              disabled={isSubmitting || !selectedTest}
                              className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                                isSubmitting || !selectedTest ? 'opacity-70 cursor-not-allowed' : ''
                              }`}
                            >
                              {isSubmitting ? 'Assigning...' : 'Assign'}
                            </button>
                            <button
                              onClick={() => {
                                setShowAssignForm(null);
                                setSelectedTest('');
                              }}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAssignForm(user.uid)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-secondary-600 hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
                        >
                          Assign Test
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;