import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import jsPDF from "jspdf";

const ReportPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const [report, setReport] = useState<string>("");
  const [resume, setResume] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Function to clean markdown symbols and add lines after each section
  const formatResumeText = (rawText: string): string => {
    if (!rawText) return "";

    // Remove markdown symbols (*, #, |)
    let clean = rawText.replace(/[*#|]/g, "").trim();

    // Split sections by headings keywords (assuming exact heading words)
    const sections = clean.split(/\n(?=Summary|Skills|Experience|Projects|Education|Note)/);

    // Append horizontal line after each section
    const withLines = sections
      .map((section) => section.trim() + "\n---------------------------------------------------------\n")
      .join("\n");

    return withLines;
  };

  useEffect(() => {
    const fetchSubmission = async () => {
      if (!testId){ return;
}
      try {
        const user = auth.currentUser;
        if (!user) {
          alert("Not authenticated");
          setLoading(false);
          return;
        }

        const submissionDocRef = doc(db, "submissions", `${testId}_${user.uid}`);
        const submissionSnap = await getDoc(submissionDocRef);

        if (submissionSnap.exists()) {
          const data = submissionSnap.data();
          setReport(data.summaryReport || "No summary report found.");
          setResume(data.resume || "No resume found.");
        } else {
          setReport("No submission found for this test.");
          setResume("");
        }
      } catch (error) {
        console.error("Error fetching submission:", error);
        setReport("Failed to load report.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [testId]);

  // Generate PDF with watermark and formatted resume text
  const generateAtsResumeAsPDF = (resumeText: string) => {
    if (!resumeText) {
      alert("No resume content to download.");
      return;
    }

    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    });

    // Add watermark (light gray, diagonal)
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setTextColor(200, 200, 200); // light gray
    doc.setFontSize(50);
    doc.setFont("helvetica", "bold");
    doc.text("DRAFT RESUME", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45,
      opacity: 0.1,
    });

    // Reset text color for content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    // Prepare text split into lines (max width to wrap)
    const margin = 40;
    const maxLineWidth = pageWidth - margin * 2;
    const lines = doc.splitTextToSize(resumeText, maxLineWidth);

    let y = margin;
    const lineHeight = 16;

    for (let i = 0; i < lines.length; i++) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(lines[i], margin, y);
      y += lineHeight;
    }

    doc.save(`Resume_${testId || "user"}.pdf`);
  };

  const handleDownloadResume = () => {
    const formattedResume = formatResumeText(resume);
    generateAtsResumeAsPDF(formattedResume);
  };
const navigate = useNavigate();

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "2rem auto",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        padding: "0 1rem",
        color: "#222",
        backgroundColor: "#fff",
        borderRadius: 8,
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        whiteSpace: "pre-wrap",
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "2rem", color: "#004080" }}>
        Test Report for <span style={{ color: "#0062B8" }}>{testId}</span>
      </h1>

     <section style={{ textAlign: "center", marginTop: "1rem" }}>
  <button
    onClick={handleDownloadResume}
    style={{
      backgroundColor: "#0062B8",
      color: "white",
      padding: "0.75rem 1.5rem",
      border: "none",
      borderRadius: 5,
      cursor: "pointer",
      fontSize: "1rem",
      fontWeight: "bold",
      boxShadow: "0 3px 6px rgba(0, 98, 184, 0.5)",
      transition: "background-color 0.3s ease",
      marginRight: "1rem",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#004a8f")}
    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0062B8")}
  >
    Download Resume (PDF)
  </button>

  <button
    onClick={() => navigate("/dashboard")}
    style={{
      backgroundColor: "#ccc",
      color: "#333",
      padding: "0.75rem 1.5rem",
      border: "none",
      borderRadius: 5,
      cursor: "pointer",
      fontSize: "1rem",
      fontWeight: "bold",
      transition: "background-color 0.3s ease",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#bbb")}
    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ccc")}
  >
    Go to Dashboard
  </button>
</section>

    </div>
  );
};

export default ReportPage;
