(async () => {
  'use strict';

  const { owner, repo, path, branch /*real_url, first_folder, base_url, rest_url*/} = getPathInfo();

  function periodicallyCheckAndAddButtons() {
    setInterval(() => {
      addCreateFolderButton();
      addDeleteButtons();
    }, 500);
  }

  async function getContent(contentUrl, accessToken) {
    const response = await fetch(contentUrl, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    if (response.ok) {
      const contentData = await response.json();
      return contentData;
    } else {
      throw new Error("Unable to obtain the file content.");
    }
  }

  function getFilePathFromUrl(url) {
    const urlObj = new URL(url);
    const parts2 = urlObj.pathname.split('/').filter(part => part !== 'blob' && part !== '');
    return parts2.slice(4).join('/');
  }

  function addDeleteButtons() {
    const filesList = document.querySelectorAll('.Box-row.js-navigation-item');
    
    for (const file of filesList) {
      const fileLink = file.querySelector('.js-navigation-open');
      const filePath = getFilePathFromUrl(fileLink.href);
      if (filePath === '..' || fileLink.title === 'Go to parent directory') {
        continue;
      }
      const existingDeleteButton = file.querySelector('.delete-button');
      if (existingDeleteButton) {
        continue; // Skip if the delete button already exists
      }
      
      const deleteButton = document.createElement('button');
      deleteButton.textContent = `Delete ${filePath}`;
      deleteButton.classList.add('btn', 'btn-sm', 'BtnGroup-item', 'delete-button');
      deleteButton.style.position = 'absolute';
      deleteButton.style.right = '150px';
      deleteButton.style.top = '4px';

      deleteButton.onclick = async () => {

        // Find the corresponding file element by traversing the DOM tree
        const fileLink = file.querySelector('.js-navigation-open');
        const clickedFilePath = getFilePathFromUrl(fileLink.href);
        
        if (!confirm('Are you sure you want to delete this file/folder?')) {
            return;
        }
    
        const accessToken = await getAccessToken();
    
        if (!accessToken) {
          alert('Access token not set. Please set it in the options page.');
          return;
        }

        const { owner, repo, path, branch } = getPathInfo();
    
        const itemPath = `${path ? path + '/' : ''}${clickedFilePath}`;
        const contentUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${itemPath}`;

    
        const deleteContent = async (url, sha) => {
          const deleteResponse = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${accessToken}`,
            },
            body: JSON.stringify({ message: `Delete ${filePath}`, sha: sha, branch: branch })
          });

          if (!deleteResponse.ok && deleteResponse.statusText) {
            alert(`deleteResponse error: ${deleteResponse.statusText}`);
          }  
        };

        const deleteNestedContent = async (items) => {
          for (const item of items) {
            if (item.type === 'dir') {
              const nestedContentUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`;
              const nestedContentData = await getContent(nestedContentUrl, accessToken);
              await deleteNestedContent(nestedContentData);
            }
            await deleteContent(`https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`, item.sha);
          }
        };
    
        try {
          const contentData = await getContent(contentUrl, accessToken);
          if (Array.isArray(contentData)) {
            // Handle folder deletion
            await deleteNestedContent(contentData);
          } else {
            // Handle file deletion
            await deleteContent(contentUrl, contentData.sha);
          }

          const actualFilesList = Array.from(filesList).filter(fileRow => !fileRow.querySelector("a[title='Go to parent directory']"));
          if (actualFilesList.length === 1) {
            const parentPath = path.split('/').slice(0, -1).join('/');
            const parentUrl = `https://github.com/${owner}/${repo}/tree/${branch}/${parentPath}`;
            location.href = parentUrl;
          } else {
            location.reload();
          }
        } catch (errors) {
            alert(`Error deleting file/folder: ${errors}. URL: ${contentUrl}, SHA: ${contentData.sha}`);
        }
      };   

      file.style.position = 'relative';
      file.insertBefore(deleteButton, file.firstChild);
    }
  }

  async function addCreateFolderButton() {
    const goToFileButton = document.querySelector('.file-navigation a[data-hydro-click*="FIND_FILE_BUTTON"]');
    if (goToFileButton) {
      const existingButton = document.querySelector('#create-folder-button');
      if (existingButton) {
        return; // Return if the button already exists
      }
      const createFolderButton = document.createElement("button");
      createFolderButton.id = "create-folder-button";
      createFolderButton.textContent = "Create Folder";
      createFolderButton.style.marginRight = "8px";
      createFolderButton.style.marginTop = "2px";
      createFolderButton.classList.add("btn", "btn-sm", "BtnGroup-item");

      /*const storedMessage = sessionStorage.getItem('folderCreatedMessage');
      if (storedMessage) {
        showAlert(storedMessage);
        sessionStorage.removeItem('folderCreatedMessage');
      }*/

      createFolderButton.onclick = async () => {
        const accessToken = await getAccessToken();

        if (!accessToken) {
          alert("Access token not set. Please set it in the options page.");
          return;
        }

        const folderName = prompt("Enter folder name:");
        if (!folderName) {
          return;
        }

        const { owner, repo, path, branch } = getPathInfo();


        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path ? path + '/' : ''}${folderName}/ReadMe.md`; // Add the ReadMe.md file
        fetch(apiUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            'Accept': 'application/vnd.github+json',
            "Authorization": `token ${accessToken}`,
          },
          body: JSON.stringify({ message: "Create new folder", content: "", branch: branch })
        })
        .then((response) => {
          if (response.status === 201) {
            /*let folderUrl;
            if (real_url.includes(first_folder)) {
              console.log("pathname include folder after branch");
              folderUrl = `${real_url}/${folderName}`;
            } else {
              console.log("pathname NOT include folder after branch");
              folderUrl = `${base_url}/tree/${branch}/${folderName}`;
            }*/
            //sessionStorage.setItem('folderCreatedMessage', `Folder <a href="${folderUrl}" target="_blank">${folderName}</a> created successfully!`);
            location.reload();
          } else {
            throw new Error(response.statusText);
          }
        })
        .catch((error) => {
          alert(`Error creating folder: ${error}`);
        });
      };

      const parentElement = goToFileButton.parentElement;
      if (parentElement) {
        parentElement.insertBefore(createFolderButton, goToFileButton);
      }
    }
  }

  periodicallyCheckAndAddButtons();

  /*async function getRepoInfo() {
    return new Promise((resolve) => {*/
      /*chrome.storage.local.get(["owner", "repo", "path", "branch"/*, "real_url", "first_folder", "base_url", "rest_url"*//*], function (data) {
        resolve({ owner: data.owner, repo: data.repo, path: data.path, branch: data.branch/*, real_url: data.real_url, 
      first_folder: data.first_folder, base_url: data.base_url, rest_url: data.rest_url*/ /*});
      });
    });
  }*/

  async function getAccessToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get("accessToken", function (data) {
        resolve(data.accessToken);
      });
    });
  }

  function getPathInfo() {
    const url = new URL(window.location.href);
    const parts = url.pathname.split("/").filter((part) => part !== "tree" && part !== "").slice(0);
    const owner = parts[0];
    const repo = parts[1];
    //const branch = parts[2];
    //const path = parts.slice(3).join("/") || "";
    const path = parts.length > 3 ? parts.slice(3).join("/") : "";
    const branchMeta = document.querySelector('meta[name="current_branch"]');
    let branch = document.querySelector("#branch-select-menu > summary > span.css-truncate-target").textContent;
    if (!branch) {
      // Fallback to getting branch from the URL
      branch = parts.length > 2 ? parts[2] : branchMeta.content;
    }
    
    return { owner, repo, path, branch };
  }

  /*function showAlert(message) {
      const modal = document.createElement('div');
      modal.style.cssText = modalStyles;
      
      const modalContent = document.createElement('div');
      modalContent.style.cssText = modalContentStyles;
      modalContent.innerHTML = message;
      
      const closeModalButton = document.createElement('button');
      closeModalButton.textContent = 'Close';
      closeModalButton.onclick = () => {
        document.body.removeChild(modal);
      };
      
      modalContent.appendChild(closeModalButton);
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
    }*/
})();