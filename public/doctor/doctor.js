let currentAppointment = null;

// Load appointments when the page loads
document.addEventListener('DOMContentLoaded', () => {
  loadAppointments();
  
  // Add event listeners for filters
  document.getElementById('statusFilter').addEventListener('change', loadAppointments);
  document.getElementById('dateFilter').addEventListener('change', loadAppointments);
});

async function loadAppointments() {
  try {
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    let url = '/api/doctor/appointments';
    const queryParams = [];
    
    if (statusFilter !== 'all') {
      queryParams.push(`status=${statusFilter}`);
    }
    if (dateFilter) {
      queryParams.push(`date=${dateFilter}`);
    }
    
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    if (!response.ok) throw new Error('Failed to load appointments');

    const appointments = await response.json();
    displayAppointments(appointments);
  } catch (error) {
    console.error('Error loading appointments:', error);
    document.getElementById('appointmentsList').innerHTML = 
      '<p class="text-red-500">Failed to load appointments</p>';
  }
}

function displayAppointments(appointments) {
  const container = document.getElementById('appointmentsList');
  
  if (!appointments || appointments.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-4">No appointments found</p>';
    return;
  }
  
  container.innerHTML = appointments.map(appointment => `
    <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div class="flex justify-between items-start">
        <div>
          <p class="font-semibold">${appointment.patient.name}</p>
          <p class="text-sm text-gray-600">
            ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time}
          </p>
          ${appointment.notes ? 
            `<p class="text-sm text-gray-600 mt-2">Notes: ${appointment.notes}</p>` : 
            ''}
          ${appointment.attachments && appointment.attachments.length > 0 ?
            `<div class="mt-3">
              <p class="text-sm text-gray-600">
                <i class="fas fa-paperclip"></i> ${appointment.attachments.length} attachment(s)
              </p>
            </div>` : 
            ''}
        </div>
        <div class="flex items-center space-x-4">
          <span class="px-3 py-1 rounded-full text-sm ${getStatusBadgeColor(appointment.status)}">
            ${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </span>
          <button 
            onclick="showAppointmentDetails('${appointment._id}')"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            View Details
          </button>
          <button 
            onclick="window.location.href='http://localhost:4000/doctor.html'"
            class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Join Call
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function getStatusBadgeColor(status) {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

async function showAppointmentDetails(appointmentId) {
  try {
    console.log('Fetching appointment details for ID:', appointmentId);
    
    const response = await fetch(`/api/appointments/${appointmentId}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch appointment details: ${response.status} ${errorText}`);
    }

    const appointment = await response.json();
    currentAppointment = appointment;
    
    if (!currentAppointment) {
      throw new Error('No appointment data received');
    }
    
    const detailsHTML = `
      <div class="space-y-4">
        <div>
          <h4 class="font-semibold">Patient Information</h4>
          <p>Name: ${currentAppointment.patient?.name || 'N/A'}</p>
          <p>Age: ${currentAppointment.patient?.age || 'N/A'}</p>
        </div>
        
        <div>
          <h4 class="font-semibold">Appointment Details</h4>
          <p>Date: ${new Date(currentAppointment.date).toLocaleDateString()}</p>
          <p>Time: ${currentAppointment.time}</p>
          <p>Status: ${currentAppointment.status.charAt(0).toUpperCase() + currentAppointment.status.slice(1)}</p>
        </div>
        
        ${currentAppointment.notes ? `
          <div>
            <h4 class="font-semibold">Notes</h4>
            <p>${currentAppointment.notes}</p>
          </div>
        ` : ''}

        ${currentAppointment.attachments && currentAppointment.attachments.length > 0 ? `
          <div>
            <h4 class="font-semibold">Attachments</h4>
            <div class="grid grid-cols-1 gap-2 mt-2">
              ${currentAppointment.attachments.map(file => `
                <div class="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <div class="flex items-center gap-2">
                    <i class="${getFileIcon(file.mimetype)}"></i>
                    <span class="text-sm text-gray-600">${file.originalName}</span>
                  </div>
                  <div class="flex gap-2">
                    <button onclick="viewFile('${currentAppointment._id}', '${file.filename}')" 
                      class="text-blue-600 hover:text-blue-800" title="View">
                      <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="downloadFile('${currentAppointment._id}', '${file.filename}', '${file.originalName}')"
                      class="text-green-600 hover:text-green-800" title="Download">
                      <i class="fas fa-download"></i>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
    
    const detailsContainer = document.getElementById('appointmentDetails');
    detailsContainer.innerHTML = detailsHTML;
    
    // Show/hide action buttons based on current status
    const completeBtn = document.getElementById('completeAppointmentBtn');
    const cancelBtn = document.getElementById('cancelAppointmentBtn');
    
    if (currentAppointment.status === 'scheduled') {
      completeBtn.style.display = 'block';
      cancelBtn.style.display = 'block';
    } else {
      completeBtn.style.display = 'none';
      cancelBtn.style.display = 'none';
    }
    
    const modal = document.getElementById('appointmentModal');
    modal.style.display = 'flex';
  } catch (error) {
    console.error('Error in showAppointmentDetails:', error);
    alert(`Failed to load appointment details: ${error.message}`);
  }
}

function closeAppointmentModal() {
  const modal = document.getElementById('appointmentModal');
  modal.style.display = 'none';
  currentAppointment = null;
}

function resetFilters() {
  document.getElementById('statusFilter').value = 'all';
  document.getElementById('dateFilter').value = '';
  loadAppointments();
}
      function addMedication() {
          const container = document.getElementById("medicationsList");
          const div = document.createElement("div");
          div.className = "flex items-center space-x-2 mb-2";
          div.innerHTML = `
              <input type="text" placeholder="Medication name" class="flex-1 px-3 py-1 border rounded">
              <input type="text" placeholder="Dosage" class="w-32 px-3 py-1 border rounded">
              <input type="text" placeholder="Frequency" class="w-40 px-3 py-1 border rounded">
              <button type="button" onclick="this.parentElement.remove()" class="px-2 py-1 text-red-500 hover:text-red-700">✕</button>
          `;
          container.appendChild(div);
      }
  
      document.getElementById("reviewForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          const prescriptionId = document.getElementById("prescriptionId").value;
          const medications = [];
  
          document.querySelectorAll("#medicationsList div").forEach(div => {
              const inputs = div.querySelectorAll("input");
              if (inputs[0].value.trim()) {
                  medications.push({
                      name: inputs[0].value.trim(),
                      dosage: inputs[1].value.trim(),
                      frequency: inputs[2].value.trim(),
                  });
              }
          });
  
          const reviewData = {
              medications,
              doctorNotes: document.getElementById("doctorNotes").value.trim(),
              status: "approved",
          };
  
          try {
              const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
                  method: "PUT",
                  headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${sessionStorage.getItem("token")}`,
                  },
                  body: JSON.stringify(reviewData),
              });
  
              if (response.ok) {
                  alert("Prescription reviewed successfully!");
                  closeReviewModal();
                  loadPrescriptions();
              } else {
                  throw new Error("Failed to submit review");
              }
          } catch (error) {
              console.error("Error submitting review:", error);
              alert(error.message);
          }
      });
        let currentPrescription = null;

        document.addEventListener("DOMContentLoaded", () => {
            if (!sessionStorage.getItem("token")) {
                window.location.href = "/index.html";
                return;
            }
            loadDoctorInfo();
            loadPrescriptions();
            setupReviewForm();
        });

        async function loadDoctorInfo() {
            try {
                const response = await fetch("/api/doctor/info", {
                    headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
                });
                const data = await response.json();
                document.getElementById("doctorName").textContent = `Dr. ${data.name}`;
            } catch (error) {
                console.error("Error loading doctor info:", error);
            }
        }

        async function loadPrescriptions() {
            try {
                const response = await fetch("/api/prescriptions", {
                    headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
                });
                const prescriptions = await response.json();
                displayPendingPrescriptions(prescriptions.filter(p => p.status === "pending"));
                displayReviewHistory(prescriptions.filter(p => p.status !== "pending"));
            } catch (error) {
                console.error("Error loading prescriptions:", error);
            }
        }

        function displayPendingPrescriptions(prescriptions) {
            const container = document.getElementById("pendingPrescriptionsList");
            container.innerHTML = prescriptions.map(p => `
                <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="font-semibold">Patient: ${p.patientId.name}</div>
                            <div class="text-gray-600">Symptoms: ${p.symptoms}</div>
                            <div class="text-gray-600">AI Diagnosis: ${p.aiDiagnosis || "No AI Analysis"}</div>
                        </div>
                        <button onclick="showReviewModal('${p._id}')" class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">Review</button>
                    </div>
                </div>
            `).join("") || '<p class="text-gray-600">No pending prescriptions</p>';
        }

        async function showReviewModal(prescriptionId) {
            try {
                const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
                    headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
                });

                currentPrescription = await response.json();
                document.getElementById("prescriptionId").value = prescriptionId;

                document.getElementById("prescriptionDetails").innerHTML = `
                    <div>
                        <h4 class="font-semibold">Patient Information:</h4>
                        <p class="text-gray-700">Name: ${currentPrescription.patientId.name}</p>
                        <p class="text-gray-600">Age: ${currentPrescription.patientId.age || "Not specified"}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold">Symptoms:</h4>
                        <p class="text-gray-700">${currentPrescription.symptoms}</p>
                        <p class="text-gray-600">Duration: ${currentPrescription.duration}</p>
                        <p class="text-gray-600">Severity: ${currentPrescription.severity}/10</p>
                    </div>
                `;

                document.getElementById("aiDiagnosis").innerHTML = currentPrescription.aiDiagnosis || "No AI Analysis";

                const modal = document.getElementById("reviewModal");
                modal.style.display = 'flex';
            } catch (error) {
                console.error("Error loading prescription details:", error);
                alert("Failed to load prescription details");
            }
        }

        function rejectPrescription() {
            alert("Prescription Rejected");
            closeReviewModal();
        }

        function closeReviewModal() {
            const modal = document.getElementById("reviewModal");
            modal.style.display = 'none';
            document.getElementById("reviewForm").reset();
            currentPrescription = null;
        }

        function logout() {
            sessionStorage.removeItem("token");
            window.location.href = "/index.html";
        }
        async function deletePrescription(prescriptionId) {
    if (!confirm("Are you sure you want to delete this prescription?")) return;

    try {
        const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sessionStorage.getItem("token")}`
            }
        });

        if (response.ok) {
            alert("Prescription deleted successfully.");
            loadPrescriptions();  // Refresh the prescription list after deletion
        } else {
            const errorMessage = await response.json();
            throw new Error(errorMessage.error || "Failed to delete prescription");
        }
    } catch (error) {
        console.error("Error deleting prescription:", error);
        alert(error.message);
    }
}
function displayReviewHistory(prescriptions) {
    const container = document.getElementById("reviewHistoryList");
    container.innerHTML = prescriptions.map(p => `
        <div class="border rounded-lg p-4 shadow-md bg-white">
            <div class="flex justify-between items-start">
                <div>
                    <div class="font-semibold">Patient: ${p.patientId.name}</div>
                    <div class="text-gray-600">Symptoms: ${p.symptoms}</div>
                    <div class="text-gray-600">AI Diagnosis: ${p.aiDiagnosis || "No AI Analysis"}</div>
                    <div class="text-gray-600 mt-2"><strong>Prescribed Medications by Doctor:</strong></div>
            <ul class="list-disc pl-5 text-gray-700">
                ${
                  p.medications && p.medications.length > 0
                    ? p.medications
                        .map(
                          (med) =>
                            `<li>${med.name} - ${med.dosage} (${med.frequency})</li>`
                        )
                        .join("")
                    : "<li>No medications prescribed</li>"
                }
            </ul>
                    <div class="text-gray-600">Doctor's Notes: ${p.doctorNotes || "No notes provided"}</div>
                    <div class="text-${p.status === 'approved' ? 'green' : 'red'}-600 font-semibold">
                        Status: ${p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </div>
                </div>
                <button onclick="deletePrescription('${p._id}')" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Delete</button>
            </div>
        </div>
    `).join("") || '<p class="text-gray-600">No review history available</p>';
}

async function deletePrescription(prescriptionId) {
    if (!confirm("Are you sure you want to delete this prescription?")) return;

    try {
        const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sessionStorage.getItem("token")}`
            }
        });

        if (response.ok) {
            alert("Prescription deleted successfully.");
            loadPrescriptions();  // Refresh the prescription list after deletion
        } else {
            const errorMessage = await response.json();
            throw new Error(errorMessage.error || "Failed to delete prescription");
        }
    } catch (error) {
        console.error("Error deleting prescription:", error);
        alert(error.message);
    }
}
async function deletePrescription(prescriptionId) {
    if (!confirm("Are you sure you want to delete this prescription?")) return;

    try {
        const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sessionStorage.getItem("token")}`
            }
        });

        if (response.ok) {
            alert("Prescription deleted successfully.");
            loadPrescriptions();  // Refresh the prescription list after deletion
        } else {
            const errorMessage = await response.json();
            throw new Error(errorMessage.error || "Failed to delete prescription");
        }
    } catch (error) {
        console.error("Error deleting prescription:", error);
        alert(error.message);
    }
}


// Helper function to color status
function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case "pending": return "text-yellow-600";
        case "approved": return "text-green-600";
        case "rejected": return "text-red-600";
        default: return "text-gray-600";
    }
}

// Add helper functions for file handling
function getFileIcon(mimetype) {
  if (mimetype.includes('pdf')) {
    return 'fas fa-file-pdf text-red-500';
  } else if (mimetype.includes('image')) {
    return 'fas fa-file-image text-green-500';
  } else if (mimetype.includes('word') || mimetype.includes('document')) {
    return 'fas fa-file-word text-blue-500';
  }
  return 'fas fa-file text-gray-500';
}

async function viewFile(appointmentId, filename) {
  try {
    const response = await fetch(`/api/appointments/${appointmentId}/attachments/${filename}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch file');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');

    // Clean up the blob URL after opening
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('Error viewing file:', error);
    alert('Failed to view file. Please try again.');
  }
}

async function downloadFile(appointmentId, filename, originalName) {
  try {
    const response = await fetch(`/api/appointments/${appointmentId}/attachments/${filename}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch file');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up the blob URL
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('Error downloading file:', error);
    alert('Failed to download file. Please try again.');
  }
}