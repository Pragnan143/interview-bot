import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import AdminLayout from '../../components/AdminLayout';
import { FileText, Users, Clock, BarChart } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalTests: 0,
    totalUsers: 0,
    activeTests: 0,
    completedTests: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total tests
        const testsSnapshot = await getDocs(collection(db, 'tests'));
        const totalTests = testsSnapshot.size;
        
        // Get total users (excluding admins)
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'user'));
        const usersSnapshot = await getDocs(usersQuery);
        const totalUsers = usersSnapshot.size;
        
        // Get active and completed tests
        const testAssignmentsSnapshot = await getDocs(collection(db, 'testAssignments'));
        const completedTests = testAssignmentsSnapshot.docs.filter(doc => doc.data().status === 'completed').length;
        const activeTests = testAssignmentsSnapshot.docs.filter(doc => doc.data().status === 'assigned').length;
        
        setStats({
          totalTests,
          totalUsers,
          activeTests,
          completedTests,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    
    fetchStats();
  }, []);

  const statCards = [
    { name: 'Total Tests', value: stats.totalTests, icon: FileText, color: 'bg-primary-500', link: '/admin/tests' },
    { name: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-secondary-500', link: '/admin/users' },
    { name: 'Active Tests', value: stats.activeTests, icon: Clock, color: 'bg-accent-500', link: '/admin/tests' },
    { name: 'Completed Tests', value: stats.completedTests, icon: BarChart, color: 'bg-success-500', link: '/admin/tests' },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => (
            <Link
              to={card.link}
              key={index}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition duration-300"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 rounded-md p-3 ${card.color} text-white`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{card.name}</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{card.value}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition duration-300">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
              <div className="mt-5 grid grid-cols-1 gap-4">
                <Link
                  to="/admin/tests/create"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Create New Test
                </Link>
                <Link
                  to="/admin/users"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Manage Users
                </Link>
                <Link
                  to="/admin/tests"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-secondary-700 bg-secondary-100 hover:bg-secondary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
                >
                  View All Tests
                </Link>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition duration-300">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Platform Overview</h3>
              <div className="mt-5 text-sm text-gray-600 space-y-4">
                <p>Welcome to the InterviewPro Admin Dashboard. Here you can:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Create and manage coding tests with AI-powered questions</li>
                  <li>Register candidates and assign them to specific tests</li>
                  <li>View comprehensive AI-generated reports for each completed test</li>
                  <li>Monitor ongoing tests and view completion statistics</li>
                </ul>
                <p className="text-primary-600 pt-2">
                  Get started by creating your first test or registering new candidates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;