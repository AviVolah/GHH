document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.local.get("accessToken", ({ accessToken }) => {
    if (accessToken) {
      document.getElementById("access-token").value = accessToken;
    }
  });

  document.getElementById("options-form").addEventListener("submit", saveOptions);
});

function saveOptions(event) {
  event.preventDefault();

  const accessToken = document.getElementById("access-token").value;

  chrome.storage.local.set({ accessToken }, () => {
    showMessage("Access token saved!", "success");
  });
}

function showMessage(message, type) {
  const messageElement = document.getElementById("message");
  messageElement.textContent = message;
  messageElement.classList.add(type);

  setTimeout(() => {
    messageElement.textContent = "";
    messageElement.classList.remove(type);
  }, 5000);
}