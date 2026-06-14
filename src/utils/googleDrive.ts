export interface GoogleProfile {
  name: string
  email: string
  picture: string
}

// Users configure their own Google OAuth Client ID via Settings
export const getClientId = (): string => {
  return localStorage.getItem('shreedesk-google-client-id') || ''
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
export const loginWithGoogle = (
  onSuccess: (token: string, profile: GoogleProfile) => void,
  onFailure: (err: any) => void
) => {
  const clientId = getClientId()

  if (!clientId || clientId.trim().length === 0) {
    onFailure(
      'No Google Client ID configured. Please add your OAuth Client ID in Settings, or contact the administrator.'
    )
    return
  }

  if (clientId === '23000000000-dummyclientid.apps.googleusercontent.com') {
    setTimeout(() => {
      const mockToken = 'mock_google_token_' + Date.now()
      const mockProfile: GoogleProfile = {
        name: 'Demo User',
        email: 'demo@shreedeskoffice.com',
        picture: ''
      }
      sessionStorage.setItem('shreedesk-google-token', mockToken)
      localStorage.setItem('shreedesk-google-profile', JSON.stringify(mockProfile))
      onSuccess(mockToken, mockProfile)
    }, 1500)
    return
  }

  try {
    // @ts-ignore
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope:
        'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: async (response: any) => {
        if (response.error) {
          onFailure(response)
          return
        }

        const token = response.access_token
        sessionStorage.setItem('shreedesk-google-token', token)

        // Fetch user profile details
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
const findDriveItem = async (
  token: string,
  name: string,
  mimeType: string,
  parentId?: string
): Promise<string | null> => {
  let query = `name = '${name}' and mimeType = '${mimeType}' and trashed = false`
  if (parentId) {
    query += ` and '${parentId}' in parents`
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!response.ok) return null
  const data = await response.json()
  return data.files?.[0]?.id || null
}

// Create Google Drive Folder
const createDriveFolder = async (
  token: string,
  name: string,
  parentId?: string
): Promise<string> => {
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

export type DriveCategory =
  | 'PDFs'
  | 'Notes'
  | 'Word Documents'
  | 'Excel Files'
  | 'PowerPoints'
  | 'Images'
  | 'Reports'
  | 'Merged Files'
  | 'Converted Files'
  | 'Backups'

// Get or create targeted directory structure in user Google Drive
export const getOrCreateFolderTree = async (
  token: string,
  category: DriveCategory
): Promise<string> => {
  // 1. Get or create root 'ShreeDeskOffice' folder
  let rootFolderId = await findDriveItem(
    token,
    'ShreeDeskOffice',
    'application/vnd.google-apps.folder'
  )
  if (!rootFolderId) {
    rootFolderId = await createDriveFolder(token, 'ShreeDeskOffice')
  }

  // 2. Get or create subfolder for category
  let subFolderId = await findDriveItem(
    token,
    category,
    'application/vnd.google-apps.folder',
    rootFolderId
  )
  if (!subFolderId) {
    subFolderId = await createDriveFolder(token, category, rootFolderId)
  }

  return subFolderId
}

// Upload file to specific Google Drive subfolder
export const uploadFileToDrive = async (
  category: DriveCategory,
  fileName: string,
  fileBlob: Blob
): Promise<{ success: boolean; message: string }> => {
  const token = getGoogleToken()
  if (!token) {
    return {
      success: false,
      message: 'Not signed in to Google. Please connect your Google account first.'
    }
  }

  if (token.startsWith('mock_google_token_')) {
    // Simulate successful upload for demo
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          message: `[Demo Mode] Saved "${fileName}" to Google Drive → ShreeDeskOffice/${category}/`
        })
      }, 500)
    })
  }

  try {
    const targetFolderId = await getOrCreateFolderTree(token, category)

    const metadata = {
      name: fileName,
      parents: [targetFolderId]
    }

    const formData = new FormData()
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    formData.append('file', fileBlob)

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      return { success: false, message: `Upload failed: ${errText}` }
    }

    return {
      success: true,
      message: `Saved "${fileName}" to Google Drive → ShreeDeskOffice/${category}/`
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown upload error'
    }
  }
}
