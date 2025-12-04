/* 
NOTE: Certain operations like Update and Create seem to take a little while
to "kick in" on the server. They may be performing basic validation.
When you add or edit something, don't be thrown off by errors when searching
for those names again for a few minutes.
*/

// Create FHIR client for SMART R3 sandbox
const client = FHIR.client("https://r3.smarthealthit.org");

//////////////////////////////
// CREATE PATIENT
//////////////////////////////

function addPatient() {
  // Prompt user for patient name
  var firstname = prompt("First name?");
  if (!firstname) return;

  var lastname = prompt("Last name?");
  if (!lastname) return;

  // Build a minimal FHIR Patient resource
  var patient = {
    resourceType: "Patient",
    name: [
      {
        given: [firstname],
        family: lastname
      }
    ]
  };

  // Create patient on server, then add a row
  client.create(patient).then(function (x) {
    addPatientRow(x);
  }).catch(console.error);
}

//////////////////////////////
// RENDER TABLE ROW
//////////////////////////////

// 'patient' is a FHIR Patient resource
function addPatientRow(patient) {
  var patientResults = document.querySelector("#patientResults");

  var tr = document.createElement("tr");

  // Patient ID
  var td = document.createElement("td");
  td.textContent = patient.id;
  tr.appendChild(td);

  // First name
  td = document.createElement("td");
  if (patient.name && patient.name[0] && patient.name[0].given && patient.name[0].given[0]) {
    td.textContent = patient.name[0].given[0];
  } else {
    td.textContent = "(none)";
  }
  tr.appendChild(td);

  // Last name
  td = document.createElement("td");
  if (patient.name && patient.name[0] && patient.name[0].family) {
    td.textContent = patient.name[0].family;
  } else {
    td.textContent = "(none)";
  }
  tr.appendChild(td);

  // Actions cell
  td = document.createElement("td");
  td.className = "action-cell";

  // Dropdown for actions
  var actionSelect = document.createElement("select");
  actionSelect.className = "action-select";
  actionSelect.title = "Choose an action for this patient";

  var optDefault = document.createElement("option");
  optDefault.value = "";
  optDefault.textContent = "⋯ Select action";
  actionSelect.appendChild(optDefault);

  var optView = document.createElement("option");
  optView.value = "view";
  optView.textContent = "📊 View Cholesterol";
  actionSelect.appendChild(optView);

  var optExport = document.createElement("option");
  optExport.value = "export";
  optExport.textContent = "📥 Export Cholesterol CSV";
  actionSelect.appendChild(optExport);

  var optEdit = document.createElement("option");
  optEdit.value = "edit";
  optEdit.textContent = "✏️ Edit Patient";
  actionSelect.appendChild(optEdit);

  var optDelete = document.createElement("option");
  optDelete.value = "delete";
  optDelete.textContent = "🗑️ Delete Patient";
  actionSelect.appendChild(optDelete);

  td.appendChild(actionSelect);

  // Run button
  var actionBtn = document.createElement("button");
  actionBtn.className = "btn-action";
  actionBtn.textContent = "Go";
  actionBtn.title = "Run selected action for this patient";

  actionBtn.onclick = function () {
    var choice = actionSelect.value;
    if (!choice) {
      alert("Please select an action.");
      return;
    }

    if (choice === "view") {
      viewCholesterol.call({ patient_id: patient.id, patient: patient });
    } else if (choice === "export") {
      exportCholesterolCSV.call({ patient_id: patient.id, patient: patient });
    } else if (choice === "edit") {
      updatePatient.call({ patient: patient, row: tr });
    } else if (choice === "delete") {
      deletePatient.call({ patient_id: patient.id, row: tr });
    }

    // Reset dropdown after action
    actionSelect.value = "";
  };

  td.appendChild(actionBtn);
  tr.appendChild(td);

  // Add row to table body
  patientResults.appendChild(tr);
}

//////////////////////////////
// READ / SEARCH PATIENTS
//////////////////////////////

function showPatients() {
  var n = prompt("Name to search:");
  if (!n) return;

  // Example: GET /Patient?name=Smith
  client.request("Patient?name=" + encodeURIComponent(n))
    .then(handlePatients)
    .catch(console.error);
}

function handlePatients(data) {
  var patientResults = document.querySelector("#patientResults");
  // Clear table body
  patientResults.innerHTML = "";

  if (data.entry) {
    for (var d = 0; d < data.entry.length; d++) {
      var patient = data.entry[d].resource;
      addPatientRow(patient);
    }
  } else {
    console.log("No patients found.");
  }
}

//////////////////////////////
// UPDATE PATIENT
//////////////////////////////

function updatePatient() {
  // "this.patient" and "this.row" come from .call(...)
  var patient = this.patient;

  var currentFirst = (patient.name && patient.name[0] && patient.name[0].given && patient.name[0].given[0])
    ? patient.name[0].given[0] : "";
  var currentLast = (patient.name && patient.name[0] && patient.name[0].family)
    ? patient.name[0].family : "";

  var firstname = prompt("First name?", currentFirst);
  if (!firstname) return;

  var lastname = prompt("Last name?", currentLast);
  if (!lastname) return;

  // JSON Patch to update first and last name
  client.patch("Patient/" + patient.id, [
    { op: "replace", path: "/name/0/given/0", value: firstname },
    { op: "replace", path: "/name/0/family", value: lastname }
  ]).then(function (updatedPatient) {
    // Add a new row with updated data
    addPatientRow(updatedPatient);
  }).catch(console.error);

  // Remove old row (if row exists)
  if (this.row && this.row.parentNode) {
    this.row.parentNode.removeChild(this.row);
  }
}

//////////////////////////////
// DELETE PATIENT
//////////////////////////////

function deletePatient() {
  if (!this.patient_id) return;

  if (confirm("Are you sure you want to delete this patient?")) {
    client.delete("Patient/" + this.patient_id)
      .catch(console.error);

    // Remove the row from the DOM
    if (this.row && this.row.parentNode) {
      this.row.parentNode.removeChild(this.row);
    }
  }
}

//////////////////////////////
// PATIENT INFO HELPER
//////////////////////////////

function getPatientInfo(patient) {
  var name = "";
  if (patient && patient.name && patient.name[0]) {
    var given = patient.name[0].given ? patient.name[0].given.join(" ") : "";
    var family = patient.name[0].family || "";
    name = (given + " " + family).trim();
  }

  var gender = patient && patient.gender ? patient.gender : null;

  var age = null;
  if (patient && patient.birthDate) {
    var birth = new Date(patient.birthDate);
    if (!isNaN(birth.getTime())) {
      var today = new Date();
      age = today.getFullYear() - birth.getFullYear();
      var m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
    }
  }

  return {
    name: name,
    gender: gender,
    age: age
  };
}

//////////////////////////////
// VIEW CHOLESTEROL (Highcharts)
//////////////////////////////

function viewCholesterol() {
  var patientId = this.patient_id || (this.patient && this.patient.id);
  var patient = this.patient;

  if (!patientId) {
    alert("Missing patient ID.");
    return;
  }

  // Build patient info (name, gender, age)
  var patientInfo = getPatientInfo(patient);

  // LOINC codes:
  // 2093-3: Total Cholesterol
  // 2085-9: HDL
  // 13457-7: LDL
  // 2571-8: Triglycerides
  var url =
    "Observation?patient=" + encodeURIComponent(patientId) +
    "&code=" +
    "http://loinc.org|2093-3," +
    "http://loinc.org|2085-9," +
    "http://loinc.org|13457-7," +
    "http://loinc.org|2571-8" +
    "&_sort=-date&_count=50";

  client.request(url)
    .then(function (data) {
      handleCholesterolData(data, patientInfo);
    })
    .catch(function (err) {
      console.error(err);
      alert("Error loading cholesterol data.");
    });
}

// Color helper: normal / borderline / high (mg/dL)
function getCholesterolColor(code, value) {
  // Total Cholesterol (2093-3): <200 normal, 200–239 borderline, >=240 high
  if (code === "2093-3") {
    if (value < 200) return "#2ecc71";   // green
    if (value < 240) return "#f1c40f";   // orange
    return "#e74c3c";                    // red
  }

  // HDL (2085-9): >=60 good, 40–59 borderline, <40 low
  if (code === "2085-9") {
    if (value >= 60) return "#2ecc71";   // green (protective)
    if (value >= 40) return "#f1c40f";   // orange
    return "#e74c3c";                    // red (low HDL)
  }

  // LDL (13457-7): <100 normal, 100–159 borderline, >=160 high
  if (code === "13457-7") {
    if (value < 100) return "#2ecc71";   // green
    if (value < 160) return "#f1c40f";   // orange
    return "#e74c3c";                    // red
  }

  // Triglycerides (2571-8): <150 normal, 150–199 borderline, >=200 high
  if (code === "2571-8") {
    if (value < 150) return "#2ecc71";   // green
    if (value < 200) return "#f1c40f";   // orange
    return "#e74c3c";                    // red
  }

  // Default color
  return "#3498db";
}

function handleCholesterolData(data, patientInfo) {
  // Store latest value for each code
  var latest = {
    "2093-3": null, // Total Cholesterol
    "2085-9": null, // HDL
    "13457-7": null, // LDL
    "2571-8": null  // Triglycerides
  };

  if (data.entry) {
    for (var i = 0; i < data.entry.length; i++) {
      var obs = data.entry[i].resource;
      if (!obs || !obs.code || !obs.code.coding || !obs.code.coding.length) continue;

      var coding = obs.code.coding[0];
      var code = coding.code;

      if (latest.hasOwnProperty(code) &&
          !latest[code] &&
          obs.valueQuantity &&
          typeof obs.valueQuantity.value !== "undefined") {

        latest[code] = {
          value: obs.valueQuantity.value,
          unit: obs.valueQuantity.unit || obs.valueQuantity.code || "",
          date: obs.effectiveDateTime || obs.issued || null
        };
      }
    }
  }

  // Fixed order + labels: Total, LDL, HDL, Triglycerides
  var order = [
    { code: "2093-3", label: "Total Cholesterol" },
    { code: "13457-7", label: "LDL" },
    { code: "2085-9", label: "HDL" },
    { code: "2571-8", label: "Triglycerides" }
  ];

  var categories = [];
  var dataPoints = [];
  var unit = "mg/dL";

  order.forEach(function (item) {
    categories.push(item.label);

    if (latest[item.code]) {
      var v = latest[item.code].value;
      var color = getCholesterolColor(item.code, v);
      var rawDate = latest[item.code].date;
      var dateDisplay = rawDate ? String(rawDate).substring(0, 10) : null;

      dataPoints.push({
        y: v,
        color: color,
        code: item.code,
        label: item.label,
        dateDisplay: dateDisplay
      });

      if (latest[item.code].unit) {
        unit = latest[item.code].unit;
      }
    } else {
      // No data for this test: keep the slot, show as grey / null
      dataPoints.push({
        y: null,
        color: "#cccccc",
        code: item.code,
        label: item.label,
        dateDisplay: null
      });
    }
  });

  var hasAnyValue = dataPoints.some(function (p) { return p.y !== null; });
  if (!hasAnyValue) {
    alert("No cholesterol data found for this patient.");
    return;
  }

  // Build title and subtitle with patient details
  var titleText = "Cholesterol Levels for " + (patientInfo.name || "Selected Patient");

  var subtitleParts = [];
  if (patientInfo.gender) {
    var g = patientInfo.gender.charAt(0).toUpperCase() + patientInfo.gender.slice(1).toLowerCase();
    subtitleParts.push("Sex: " + g);
  }
  if (typeof patientInfo.age === "number") {
    subtitleParts.push("Age: " + patientInfo.age);
  }
  subtitleParts.push("Green = normal · Orange = borderline · Red = high");

  var subtitleText = subtitleParts.join(" · ");

  // Draw bar chart using Highcharts
  Highcharts.chart("cholesterolChart", {
    chart: {
      type: "bar"
    },
    title: {
      text: titleText
    },
    subtitle: {
      text: subtitleText
    },
    xAxis: {
      categories: categories,
      title: {
        text: "Test"
      }
    },
    yAxis: {
      min: 0,
      title: {
        text: "Level (" + unit + ")"
      }
    },
    tooltip: {
      formatter: function () {
        if (this.y === null) {
          return "<b>" + this.point.label + "</b><br/>No value available";
        }
        var s = "<b>" + this.point.label + "</b><br/>" +
                "Value: <b>" + this.y + " " + unit + "</b>";
        if (this.point.dateDisplay) {
          s += "<br/>Date: <b>" + this.point.dateDisplay + "</b>";
        }
        return s;
      }
    },
    legend: {
      enabled: false
    },
    series: [{
      name: "Cholesterol",
      data: dataPoints
    }]
  });
}

//////////////////////////////
// EXPORT CHOLESTEROL TO CSV
//////////////////////////////

function exportCholesterolCSV() {
  var patientId = this.patient_id || (this.patient && this.patient.id);
  if (!patientId) {
    alert("Missing patient ID.");
    return;
  }

  var url =
    "Observation?patient=" + encodeURIComponent(patientId) +
    "&code=" +
    "http://loinc.org|2093-3," +
    "http://loinc.org|2085-9," +
    "http://loinc.org|13457-7," +
    "http://loinc.org|2571-8" +
    "&_sort=-date&_count=50";

  client.request(url)
    .then(function (data) {
      // Same "latest" logic as chart, but used to build CSV
      var latest = {
        "2093-3": null,
        "2085-9": null,
        "13457-7": null,
        "2571-8": null
      };

      if (data.entry) {
        for (var i = 0; i < data.entry.length; i++) {
          var obs = data.entry[i].resource;
          if (!obs || !obs.code || !obs.code.coding || !obs.code.coding.length) continue;

          var coding = obs.code.coding[0];
          var code = coding.code;

          if (latest.hasOwnProperty(code) &&
              !latest[code] &&
              obs.valueQuantity &&
              typeof obs.valueQuantity.value !== "undefined") {

            latest[code] = {
              value: obs.valueQuantity.value,
              unit: obs.valueQuantity.unit || obs.valueQuantity.code || ""
            };
          }
        }
      }

      var order = [
        { code: "2093-3", label: "Total Cholesterol" },
        { code: "13457-7", label: "LDL" },
        { code: "2085-9", label: "HDL" },
        { code: "2571-8", label: "Triglycerides" }
      ];

      var rows = ["Test,LOINC Code,Value,Unit"];
      var hasAny = false;

      order.forEach(function (item) {
        var entry = latest[item.code];
        if (entry) {
          hasAny = true;
          var val = entry.value;
          var unit = entry.unit || "";
          rows.push(
            '"' + item.label + '",' +
            '"' + item.code + '",' +
            '"' + val + '",' +
            '"' + unit + '"'
          );
        } else {
          // Row with no value
          rows.push(
            '"' + item.label + '",' +
            '"' + item.code + '",' +
            ',""'
          );
        }
      });

      if (!hasAny) {
        alert("No cholesterol data to export for this patient.");
        return;
      }

      var csv = rows.join("\n");
      var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      var url = URL.createObjectURL(blob);

      var link = document.createElement("a");
      link.href = url;
      link.download = "cholesterol_" + patientId + ".csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    })
    .catch(function (err) {
      console.error(err);
      alert("Error exporting cholesterol data.");
    });
}
