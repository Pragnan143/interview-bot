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
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true; // Flag to track component mounted status

    const fetchSubmission = async () => {
      if (!testId) {
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) {
          alert("You are not authenticated. Please log in.");
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        const submissionDocRef = doc(
          db,
          "submissions",
          `${testId}_${user.uid}`
        );
        const submissionSnap = await getDoc(submissionDocRef);

        if (submissionSnap.exists()) {
          const data = submissionSnap.data();

          // Clean unwanted markdown block from resume before setting
          const rawResume = data?.resume || "";
          const cleanedResume = rawResume
            .replace(
              /Okay, based on the provided interview details[\s\S]*?guidance on how to populate them\./i,
              ""
            )
            .trim();

          if (isMounted) {
            setReport(data?.summaryReport || "No summary report found.");
            setResume(cleanedResume || "No resume found.");
          }
        } else {
          if (isMounted) {
            setReport("No submission found for this test.");
            setResume("");
          }
        }
      } catch (error) {
        console.error("Error fetching submission:", error);
        if (isMounted) {
          setReport("Failed to load report.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSubmission();

    return () => {
      isMounted = false;
    };
  }, [testId]);

  function parseResumeText(resumeText: string) {
    const lines = resumeText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const sections: Record<string, string[]> = {};
    let currentSection = "Header"; // Before first recognized header

    const headers = new Set([
      "Summary",
      "Skills",
      "Experience",
      "Projects",
      "Education",
      "Certifications",
      "Achievements",
    ]);

    sections[currentSection] = [];

    for (const line of lines) {
      if (headers.has(line)) {
        currentSection = line;
        if (!sections[currentSection]) {
          sections[currentSection] = [];
        }
      } else {
        sections[currentSection].push(line);
      }
    }

    // Convert arrays to strings for easy rendering
    const parsedSections: Record<string, string> = {};
    for (const key in sections) {
      parsedSections[key] = sections[key].join("\n");
    }

    return parsedSections;
  }

  const downloadFormattedResume = () => {
    if (!resume) {
      alert("No resume content available.");
      return;
    }

    const sections = parseResumeText(resume);

    const doc = new jsPDF("p", "pt", "a4");
    const margin = 40;
    const pageHeight = doc.internal.pageSize.height;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    const lineHeight = 15;
    let y = margin;

    // Footer text content
    const footerText =
      "We guarantee skills upon test and summary. Not anything where you need to update in your resume.";

    // Helper to add footer on current page
    function addFooter() {
      const footerFontSize = 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(footerFontSize);
      doc.setTextColor(100); // gray color
      const footerY = pageHeight - 20;
      const footerWidth = doc.internal.pageSize.getWidth();
      // center footer text
      const textWidth = doc.getTextWidth(footerText);
      const x = (footerWidth - textWidth) / 2;
      doc.text(footerText, x, footerY);
    }

    // Helper to add text with word-wrap and page breaks
    function addText(
      text: string,
      fontSize = 8,
      fontStyle: "normal" | "bold" = "normal",
      isHeader = false,
      highlight = false
    ) {
      doc.setFont("helvetica", fontStyle);
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, width);

      for (const line of lines) {
        if (y + lineHeight > pageHeight - margin) {
          addFooter(); // Add footer before adding new page
          doc.addPage();
          y = margin;
        }
        if (highlight) {
          const textWidth = doc.getTextWidth(line);
          const padding = 2;
          doc.setFillColor(255, 255, 0); // yellow highlight
          doc.rect(
            margin - padding,
            y - fontSize + 3,
            textWidth + padding * 2,
            lineHeight,
            "F"
          );
          doc.setTextColor(0, 0, 0); // black text on highlight
        } else {
          doc.setTextColor(0, 0, 0);
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }
      if (isHeader) y += 8; // Extra spacing after headers
    }

    // Add Header (Name & contact info)
    if (sections.Header) {
      addText(sections.Header, 12, "bold");
      y += 10;
    }

    // Add other sections in order
    const order = [
      "Summary",
      "Skills",
      "Experience",
      "Projects",
      "Education",
      "Certifications",
      "Achievements",
    ];
    order.forEach((sectionName) => {
      if (sections[sectionName]) {
        addText(sectionName, 12, "bold", true);
        // Highlight Skills section text
        const highlightSkills = sectionName === "Skills";
        addText(sections[sectionName], 8, "normal", false, highlightSkills);
      }
    });

    addFooter(); // Add footer on the last page

    doc.save("Formatted_Resume.pdf");
  };

  const downloadReportAsPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    const lines = doc.splitTextToSize(report, width);
    let y = margin;

    lines.forEach((line) => {
      if (y + 20 > doc.internal.pageSize.height - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 16;
    });

    doc.save(`Summary_Report_${testId || "user"}.pdf`);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "2rem",
        padding: "2rem",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backgroundColor: "#f4f6f8",
        minHeight: "100vh",
      }}
    >
      {loading ? (
        <p style={{ fontSize: "1.2rem", textAlign: "center", width: "100%" }}>
          Loading...
        </p>
      ) : (
        <>
          {/* Left: Summary Report */}
          <div
            className="h-screen w-1/2 fixed left-4"
            style={{
              flex: 1,
              backgroundColor: "#fff",
              borderRadius: 10,
              padding: "1.5rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              overflowY: "auto", // enable vertical scroll
            }}
          >
            <h2
              style={{
                color: "#004080",
                fontSize: "1.5rem",
                marginBottom: "1rem",
              }}
            >
              📋 Summary Report
            </h2>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                background: "#f9f9f9",
                padding: "1rem",
                borderRadius: 8,
              }}
            >
              {report}
            </pre>
          </div>

          {/* Right: Resume + Buttons */}
          <div
            className="h-screen w-[45%] fixed right-4"
            style={{
              flex: 1,
              backgroundColor: "#fff",
              borderRadius: 10,
              padding: "1.5rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* <div>
              <h2
                style={{
                  color: "#004080",
                  fontSize: "1.5rem",
                  marginBottom: "1rem",
                }}
              >
                📄 Formatted Resume
              </h2>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  background: "#f1faff",
                  padding: "1rem",
                  borderRadius: 8,
                  maxHeight: "400px",
                  overflowY: "auto",
                }}
              >
                {resume}
              </pre>
            </div> */}

            <div
              style={{
                marginTop: "2rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <button
                onClick={downloadFormattedResume}
                style={{
                  backgroundColor: "#0062B8",
                  color: "white",
                  padding: "0.75rem",
                  border: "none",
                  borderRadius: 5,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                📥 Download Sample Resume (PDF)
              </button>

              <button
                onClick={downloadReportAsPDF}
                style={{
                  backgroundColor: "#00A86B",
                  color: "white",
                  padding: "0.75rem",
                  border: "none",
                  borderRadius: 5,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                📄 Download Report (PDF)
              </button>

              <button
                onClick={() => navigate("/dashboard")}
                style={{
                  backgroundColor: "#ccc",
                  color: "#333",
                  padding: "0.75rem",
                  border: "none",
                  borderRadius: 5,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                🔙 Go to Dashboard
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportPage;
