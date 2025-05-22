import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  query, 
  orderBy, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Test {
  id: string;
  title: string;
  topics: string[];
  role: string;
  duration: number;
  vivaEnabled: boolean;
  createdAt: string;
  assignedCount: number;
  completedCount: number;
}

const AdminTests: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null); // Track which test is being deleted
  const { addToast } = useToast();

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const q = query(collection(db, 'tests'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const testDocs: Test[] = [];
        
        for (const doc of querySnapshot.docs) {
          const testData = doc.data() as Omit<Test, 'id' | 'assignedCount' | 'completedCount'>;
          
          // Get assignment counts
          const assignmentsQuery = query(collection(db, 'testAssignments'));
          const assignmentsSnapshot = await getDocs(assignmentsQuery);
          
          const testAssignments = assignmentsSnapshot.docs.filter(
            assignDoc => assignDoc.data().testId === doc.id
          );
          
          const assignedCount = testAssignments.length;
          const completedCount = testAssignments.filter(
            assignDoc => assignDoc.data().status === 'completed'
          ).length;
          
          testDocs.push({
            id: doc.id,
            ...testData,
            assignedCount,
            completedCount,
          });
        }
        
        setTests(testDocs);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching tests:', error);
        addToast('Failed to load tests', 'error');
        setLoading(false);
      }
    };
    
    fetchTests();
  }, [addToast]);

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }
    
    setDeleting(id); // Start deletion process
    
    try {
      // Check if test has assignments
      const testDoc = await getDoc(doc(db, 'tests', id));
      if (!testDoc.exists()) {
        addToast('Test not found', 'error');
        setDeleting(null);
        return;
      }
      
      const assignmentsQuery = query(collection(db, 'testAssignments'));
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const testAssignments = assignmentsSnapshot.docs.filter(
        assignDoc => assignDoc.data().testId === id
      );
      
      // if (testAssignments.length > 0) {
      //   addToast('Cannot delete test with active assignments', 'error');
      //   setDeleteConfirm(null);
      //   setDeleting(null); // Reset deleting state
      //   return;
      // }
      
      // Delete the test
      await deleteDoc(doc(db, 'tests', id));
      
      // Update local state
      setTests(prevTests => prevTests.filter(test => test.id !== id));
      addToast('Test deleted successfully', 'success');
      setDeleteConfirm(null);
      setDeleting(null); // Reset deleting state
    } catch (error) {
      console.error('Error deleting test:', error);
      addToast('Failed to delete test', 'error');
      setDeleting(null); // Reset deleting state
    }
  };

  return (
    <AdminLayout title="Tests">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Manage Tests</h2>
        <Link
          to="/admin/tests/create"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Test
        </Link>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : 
      tests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No tests found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first test.</p>
          <div className="mt-6">
            <Link
              to="/admin/tests/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Test
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md animate-fade-in">
          <ul className="divide-y divide-gray-200">
            {tests.map((test) => (
              <li key={test.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition duration-150">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <p className="text-lg font-semibold text-primary-600 truncate">{test.title}</p>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span className="truncate mr-2">Role: {test.role}</span>
                        <span className="mr-2">•</span>
                        <span>{test.duration} minutes</span>
                        <span className="mx-2">•</span>
                        <span className={test.vivaEnabled ? 'text-success-600' : 'text-gray-500'}>
                          {test.vivaEnabled ? 'Viva Enabled' : 'No Viva'}
                        </span>
                      </div>
                      <div className="mt-1">
                        {test.topics.map((topic, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mr-2 mt-2"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center space-x-6">
                        <div className="flex items-center text-sm">
                          <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-secondary-500" />
                          <span className="text-gray-600">{test.assignedCount} assigned</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <CheckCircle className="flex-shrink-0 mr-1.5 h-4 w-4 text-success-500" />
                          <span className="text-gray-600">{test.completedCount} completed</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(test.id)}
                        className={`inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white ${
                          deleteConfirm === test.id
                            ? 'bg-error-600 hover:bg-error-700'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error-500`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Link
                        to={`/admin/tests/edit/${test.id}`}
                        className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
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

export default AdminTests;
