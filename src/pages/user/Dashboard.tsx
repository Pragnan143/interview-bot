import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import UserLayout from "../../components/UserLayout";
import { FileText, Clock, CheckCircle, PlayCircle } from "lucide-react";
interface Test {
  id: string;
  title: string;
  topics: string[];
  role: string;
  duration: number;
  vivaEnabled: boolean;
}

interface TestAssignment {
  id: string;
  testId: string;
  status: "assigned" | "in_progress" | "completed";
  assignedAt: string;
  completedAt: string | null;
  test: Test | null;
}

const UserDashboard: React.FC = () => {
  const [assignments, setAssignments] = useState<TestAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    // const fetchAssignments = async () => {
    //   if (!currentUser) return;

    //   try {
    //     // Get user's test assignments
    //     const assignmentsQuery = query(
    //       collection(db, "testAssignments"),
    //       where("userId", "==", currentUser.uid)
    //     );

    //     const assignmentsSnapshot = await getDocs(assignmentsQuery);

    //     const assignmentPromises = assignmentsSnapshot.docs.map(async (doc) => {
    //       const data = doc.data();
    //       const testDoc = await getDocs(
    //         query(collection(db, "tests"), where("__name__", "==", data.testId))
    //       );

    //       const test = testDoc.empty
    //         ? null
    //         : ({ id: testDoc.docs[0].id, ...testDoc.docs[0].data() } as Test);

    //       return {
    //         id: doc.id,
    //         testId: data.testId,
    //         status: data.status,
    //         assignedAt: data.assignedAt,
    //         completedAt: data.completedAt,
    //         test,
    //       };
    //     });

    //     const assignmentList = await Promise.all(assignmentPromises);
    //     setAssignments(assignmentList);
    //     setLoading(false);
    //   } catch (error) {
    //     console.error("Error fetching assignments:", error);
    //     setLoading(false);
    //   }
    // };


    const fetchAssignments = async () => {
      if (!currentUser) {
        setLoading(false); // <== Add this
        return;
      }
    
      try {
        // Existing code for getting assignments
        const assignmentsQuery = query(
          collection(db, "testAssignments"),
          where("userId", "==", currentUser.uid)
        );
    
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
    
        const assignmentPromises = assignmentsSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const testDoc = await getDocs(
            query(collection(db, "tests"), where("__name__", "==", data.testId))
          );
    
          const test = testDoc.empty
            ? null
            : ({ id: testDoc.docs[0].id, ...testDoc.docs[0].data() } as Test);
    
          return {
            id: doc.id,
            testId: data.testId,
            status: data.status,
            assignedAt: data.assignedAt,
            completedAt: data.completedAt,
            test,
          };
        });
    
        const assignmentList = await Promise.all(assignmentPromises);
        setAssignments(assignmentList);
      } catch (error) {
        console.error("Error fetching assignments:", error);
      } finally {
        setLoading(false); // ✅ Always stop loading
      }
    };
    
    fetchAssignments();
  }, [currentUser]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <UserLayout title="Your Tests">
      <div className="bg-white shadow overflow-hidden sm:rounded-md animate-fade-in">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              No tests assigned
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have any tests assigned to you yet. Please contact your
              administrator.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {assignments.map((assignment) => (
              <li key={assignment.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-primary-600 truncate">
                        {assignment.test?.title || "Unknown Test"}
                      </h3>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span>
                          {assignment.test?.role || "Role not specified"}
                        </span>
                        <span className="mx-2">•</span>
                        <span>{assignment.test?.duration || 0} minutes</span>
                        {assignment.test?.vivaEnabled && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-accent-600">
                              Includes Viva
                            </span>
                          </>
                        )}
                      </div>

                      <div className="mt-1">
                        {assignment.test?.topics.map((topic, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mr-2 mt-2"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center text-sm">
                        {assignment.status === "assigned" ? (
                          <div className="flex items-center text-warning-600">
                            <Clock className="flex-shrink-0 mr-1.5 h-4 w-4" />
                            <span>
                              Assigned on {formatDate(assignment.assignedAt)}
                            </span>
                          </div>
                        ) : assignment.status === "completed" ? (
                          <div className="flex items-center text-success-600">
                            <CheckCircle className="flex-shrink-0 mr-1.5 h-4 w-4" />
                            <span>
                              Completed on{" "}
                              {assignment.completedAt
                                ? formatDate(assignment.completedAt)
                                : "Unknown"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center text-primary-600">
                            <Clock className="flex-shrink-0 mr-1.5 h-4 w-4" />
                            <span>In progress</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4 flex-shrink-0">
                      {assignment.status === "assigned" ? (
                        <Link
                          to={`/test/${assignment.id}`}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          <PlayCircle className="mr-1.5 h-4 w-4" />
                          Start Test
                        </Link>
                      ) : assignment.status === "completed" ? (
                        <Link
                          to={`/test/${assignment.id}/report`}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-secondary-600 hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
                        >
                          View Report
                        </Link>
                      ) : (
                        <Link
                          to={`/test/${assignment.id}`}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-warning-600 hover:bg-warning-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-warning-500"
                        >
                          Continue Test
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </UserLayout>
  );
};

export default UserDashboard;
