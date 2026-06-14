export interface GoogleProfile {
  name: string
  email: string
  picture: string
}

// Sandbox Client ID. Users can override this in their dashboard settings
const DEFAULT_CLIENT_ID = '936528340156-placeholder-clientId.apps.googleusercontent.com'

export const getClientId = (): string => {
  return localStorage.getItem('shreedesk-google-client-id') || DEFAULT_CLIENT_ID
}

export const setClientId = (id: string): void => {
  localStorage.setItem('shreedesk-google-client-id', id.trim())
}

// Check if user is authenticated with Google
export const getGoogleToken = (): string | null => {
  return sessionStorage.getItem('shreedesk-google-token')
}

export const getGoogleProfile = (): GoogleProfile | null => {
  const profile = localStorage.getItem('shreedesk-google-profile')
  if (profile) {
    try {
      return JSON.parse(profile)
    } catch (e) {
      return null
    }
  }
  return null
}

// Trigger Google OAuth2 Sign-In Implicit Flow
export const loginWithGoogle = (onSuccess: (token: string, profile: GoogleProfile) => void, onFailure: (err: any) => void) => {
  const clientId = getClientId()
  const useSandbox = localStorage.getItem('shreedesk-google-use-sandbox') === 'true'
  
  if (useSandbox || clientId.includes('placeholder')) {
    if (useSandbox) {
      // Demo Simulation Mode (WOW-factor Mock Login)
      setTimeout(() => {
        const mockProfile: GoogleProfile = {
          name: 'Abhishek Shrivastava (Demo)',
          email: 'abhishek@shreedesk.office',
          picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80'
        }
        sessionStorage.setItem('shreedesk-google-token', 'mock-sandbox-token-123456')
        localStorage.setItem('shreedesk-google-profile', JSON.stringify(mockProfile))
        onSuccess('mock-sandbox-token-123456', mockProfile)
      }, 1000)
      return
    } else {
      onFailure('Google Client ID is not configured. Please enter a valid Client ID or enable Sandbox Mode on the login page.')
      return
    }
  }

  try {
    // @ts-ignore
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: async (response: any) => {
        if (response.error) {
          onFailure(response)
          return
        }

        const token = response.access_token
        sessionStorage.setItem('shreedesk-google-token', token)

        // Fetch User profile details
        try {
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
          })
          const profileData = await profileRes.json()
          const profile: GoogleProfile = {
            name: profileData.name || 'Google User',
            email: profileData.email || '',
            picture: profileData.picture || ''
          }
          localStorage.setItem('shreedesk-google-profile', JSON.stringify(profile))
          onSuccess(token, profile)
        } catch (err) {
          onFailure(err)
        }
      }
    })

    tokenClient.requestAccessToken()
  } catch (err) {
    onFailure(err)
  }
}

export const logoutGoogle = () => {
  sessionStorage.removeItem('shreedesk-google-token')
  localStorage.removeItem('shreedesk-google-profile')
}

// Find Google Drive file/folder by name and parent
const findDriveItem = async (token: string, name: string, mimeType: string, parentId?: string): Promise<string | null> => {
  let query = `name = '${name}' and mimeType = '${mimeType}' and trashed = false`
  if (parentId) {
    query += ` and '${parentId}' in parents`
  }
  
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  
  if (!response.ok) return null
  const data = await response.json()
  return data.files?.[0]?.id || null
}

// Create Google Drive Folder
const createDriveFolder = async (token: string, name: string, parentId?: string): Promise<string> => {
  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : undefined
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  })

  const data = await response.json()
  return data.id
}

// Get or Create targeted directory structure in user Google Drive
export const getOrCreateFolderTree = async (token: string, category: 'PDF' | 'Excel' | 'Word' | 'PPT'): Promise<string> => {
  if (token.startsWith('mock-')) {
    return 'mock-folder-id-xyz'
  }

  // 1. Get or Create root 'ShreeDeskOffice' folder
  let rootFolderId = await findDriveItem(token, 'ShreeDeskOffice', 'application/vnd.google-apps.folder')
  if (!rootFolderId) {
    rootFolderId = await createDriveFolder(token, 'ShreeDeskOffice')
  }

  // 2. Get or Create subfolder (e.g. PDF, Excel, Word, PPT)
  let subFolderId = await findDriveItem(token, category, 'application/vnd.google-apps.folder', rootFolderId)
  if (!subFolderId) {
    subFolderId = await createDriveFolder(token, category, rootFolderId)
  }

  return subFolderId
}

// Upload file to specific Google Drive Subfolder
export const uploadFileToDrive = async (
  category: 'PDF' | 'Excel' | 'Word' | 'PPT',
  fileName: string,
  fileBlob: Blob
): Promise<{ success: boolean; message: string }> => {
  const token = getGoogleToken()
  if (!token) {
    return { success: false, message: 'Google Authentication Token missing. Log in first.' }
  }

  try {
    if (token.startsWith('mock-')) {
      // Simulate Successful Upload
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: `[Demo Mode] Successfully synced "${fileName}" to Google Drive folder: ShreeDeskOffice/${category}/`
          })
        }, 1500)
      })
    }

    // Get Target folder ID
    const targetFolderId = await getOrCreateFolderTree(token, category)

    // Multipart upload
    const metadata = {
      name: fileName,
      parents: [targetFolderId]
    }

    const formData = new FormData()
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    formData.append('file', fileBlob)

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    })

    if (!response.ok) {
      const errText = await response.text()
      return { success: false, message: `Upload failed: ${errText}` }
    }

    return { success: true, message: `Synced "${fileName}" to Google Drive folder: ShreeDeskOffice/${category}/` }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Unknown upload error' }
  }
}
