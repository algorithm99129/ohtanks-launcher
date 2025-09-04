import { inject, injectable } from 'inversify';
import { supabase } from '@/src/shared/supabase/client';
import { TYPES } from '../container';
import Window from './windows';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
import { createWriteStream } from 'fs';
import * as yauzl from 'yauzl';

@injectable()
class AppLauncher {
  constructor(@inject(TYPES.MainWindow) private readonly mainWindow: Window) {}

  private async checkAppVersion(): Promise<string[]> {
    const versionsPath = path.join(process.cwd(), 'versions');

    try {
      // Check if versions directory exists
      if (!fs.existsSync(versionsPath)) {
        console.log('Versions directory does not exist');
        return [];
      }

      // Read all items in the versions directory
      const items = fs.readdirSync(versionsPath, { withFileTypes: true });

      // Filter only directories and extract their names as version numbers
      const versions = items
        .filter((item) => item.isDirectory())
        .map((item) => item.name)
        .sort((a, b) => {
          // Sort versions in descending order (newest first)
          return this.compareVersions(b, a);
        });

      console.log('Available versions:', versions);
      return versions;
    } catch (error) {
      console.error('Error checking app versions:', error);
      return [];
    }
  }

  private compareVersions(versionA: string, versionB: string): number {
    // Simple version comparison for semantic versioning (e.g., "1.2.3")
    const aParts = versionA.split('.').map(Number);
    const bParts = versionB.split('.').map(Number);

    const maxLength = Math.max(aParts.length, bParts.length);

    for (let i = 0; i < maxLength; i++) {
      const a = aParts[i] || 0;
      const b = bParts[i] || 0;

      if (a > b) return 1;
      if (a < b) return -1;
    }

    return 0;
  }

  private async downloadFromGoogleDrive(
    fileId: string,
    filePath: string,
  ): Promise<void> {
    // First attempt: Try direct download
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    try {
      const response = await axios({
        method: 'GET',
        url: directUrl,
        responseType: 'stream',
        timeout: 300000,
        maxRedirects: 5,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      // Check if we got HTML content (virus scan warning)
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        console.log(
          'Google Drive virus scan detected, trying alternative method...',
        );
        throw new Error('VIRUS_SCAN_DETECTED');
      }

      // If we get here, it's a direct download
      const writer = createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
        response.data.on('error', reject);
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'VIRUS_SCAN_DETECTED') {
        // Try the alternative method for virus-scanned files
        return this.downloadFromGoogleDriveWithConfirmation(fileId, filePath);
      }
      throw error;
    }
  }

  private async downloadFromGoogleDriveWithConfirmation(
    fileId: string,
    filePath: string,
  ): Promise<void> {
    // Method for files that Google Drive can't scan for viruses
    // This requires a two-step process: get confirmation token, then download

    try {
      // Step 1: Get the confirmation page
      const confirmUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const confirmResponse = await axios({
        method: 'GET',
        url: confirmUrl,
        timeout: 300000,
        maxRedirects: 5,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      // Extract confirmation token and other form data from the HTML
      const html = confirmResponse.data;

      // Look for the form with all the hidden inputs
      const formMatch = html.match(
        /<form[^>]*action="([^"]*)"[^>]*>([\s\S]*?)<\/form>/i,
      );
      if (!formMatch) {
        throw new Error(
          'Could not find download form in Google Drive response',
        );
      }

      const formAction = formMatch[1];
      const formContent = formMatch[2];

      // Extract all form data
      const formData: { [key: string]: string } = {};

      // Extract id
      const idMatch = formContent.match(/name="id"\s+value="([^"]+)"/);
      if (idMatch) formData.id = idMatch[1];

      // Extract export
      const exportMatch = formContent.match(/name="export"\s+value="([^"]+)"/);
      if (exportMatch) formData.export = exportMatch[1];

      // Extract confirm
      const confirmMatch = formContent.match(
        /name="confirm"\s+value="([^"]+)"/,
      );
      if (confirmMatch) formData.confirm = confirmMatch[1];

      // Extract uuid
      const uuidMatch = formContent.match(/name="uuid"\s+value="([^"]+)"/);
      if (uuidMatch) formData.uuid = uuidMatch[1];

      console.log('Extracted form data:', formData);
      console.log('Form action:', formAction);

      // Build the download URL with all form parameters
      const downloadUrl = `${formAction}?${Object.entries(formData)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')}`;

      console.log('Built download URL:', downloadUrl);

      const downloadResponse = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 300000,
        maxRedirects: 5,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      const writer = createWriteStream(filePath);
      downloadResponse.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          // Validate that we got a valid zip file
          try {
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
              reject(new Error('Downloaded file is empty'));
              return;
            }

            // Check if it's a valid zip file by reading the first few bytes
            const fd = fs.openSync(filePath, 'r');
            const buffer = Buffer.alloc(4);
            fs.readSync(fd, buffer, 0, 4, 0);
            fs.closeSync(fd);

            // Check for ZIP file signature (PK)
            if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
              console.error('File signature:', buffer.toString('hex'));
              reject(new Error('Downloaded file is not a valid zip file'));
              return;
            }

            console.log('Downloaded file is valid zip file');
            resolve();
          } catch (error) {
            reject(
              new Error(
                `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              ),
            );
          }
        });
        writer.on('error', reject);
        downloadResponse.data.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading with confirmation method:', error);
      throw new Error(
        `Failed to download from Google Drive: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async downloadFromGoogleDriveAlternative(
    fileId: string,
    filePath: string,
  ): Promise<void> {
    // Alternative method using different Google Drive API endpoint
    try {
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 300000,
        maxRedirects: 10,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          DNT: '1',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      const writer = createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          // Validate that we got a valid zip file
          try {
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
              reject(new Error('Downloaded file is empty'));
              return;
            }

            // Check if it's a valid zip file by reading the first few bytes
            const fd = fs.openSync(filePath, 'r');
            const buffer = Buffer.alloc(4);
            fs.readSync(fd, buffer, 0, 4, 0);
            fs.closeSync(fd);

            // Check for ZIP file signature (PK)
            if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
              console.error('File signature:', buffer.toString('hex'));
              reject(new Error('Downloaded file is not a valid zip file'));
              return;
            }

            console.log('Downloaded file is valid zip file');
            resolve();
          } catch (error) {
            reject(
              new Error(
                `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              ),
            );
          }
        });
        writer.on('error', reject);
        response.data.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading with alternative method:', error);
      throw new Error(
        `Failed to download from Google Drive (alternative method): ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async extractZipFile(
    zipPath: string,
    extractPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        if (!zipfile) {
          reject(new Error('Failed to open zip file'));
          return;
        }

        let extractedCount = 0;
        let totalEntries = 0;

        // First pass: count total entries
        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
          totalEntries++;
          zipfile.readEntry();
        });

        zipfile.on('end', () => {
          // Second pass: extract files
          yauzl.open(zipPath, { lazyEntries: true }, (err2, zipfile2) => {
            if (err2) {
              reject(err2);
              return;
            }

            if (!zipfile2) {
              reject(new Error('Failed to open zip file for extraction'));
              return;
            }

            zipfile2.readEntry();
            zipfile2.on('entry', (entry) => {
              if (/\/$/.test(entry.fileName)) {
                // Directory entry
                const dirPath = path.join(extractPath, entry.fileName);
                if (!fs.existsSync(dirPath)) {
                  fs.mkdirSync(dirPath, { recursive: true });
                }
                zipfile2.readEntry();
              } else {
                // File entry
                zipfile2.openReadStream(entry, (err3, readStream) => {
                  if (err3) {
                    reject(err3);
                    return;
                  }

                  if (!readStream) {
                    reject(new Error('Failed to create read stream'));
                    return;
                  }

                  const filePath = path.join(extractPath, entry.fileName);
                  const dirPath = path.dirname(filePath);

                  // Ensure directory exists
                  if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                  }

                  const writeStream = fs.createWriteStream(filePath);
                  readStream.pipe(writeStream);

                  writeStream.on('close', () => {
                    extractedCount++;
                    const progress = Math.round(
                      (extractedCount / totalEntries) * 100,
                    );
                    this.mainWindow.send(
                      'status_message',
                      `Extracting files: ${progress}% (${extractedCount}/${totalEntries})`,
                    );
                    zipfile2.readEntry();
                  });

                  writeStream.on('error', (err4) => {
                    reject(err4);
                  });
                });
              }
            });

            zipfile2.on('end', () => {
              console.log(
                `Extraction completed: ${extractedCount} files extracted`,
              );
              this.mainWindow.send(
                'status_message',
                `Extraction completed: ${extractedCount} files extracted`,
              );
              resolve();
            });

            zipfile2.on('error', (err5) => {
              reject(err5);
            });
          });
        });

        zipfile.on('error', (err6) => {
          reject(err6);
        });
      });
    });
  }

  private async checkLatestVersion() {
    this.mainWindow.send(
      'status_message',
      'Checking latest version. Please wait ...',
    );

    // Get current platform
    const currentPlatform =
      process.platform === 'win32'
        ? 'WINDOWS'
        : process.platform === 'darwin'
          ? 'MACOS'
          : process.platform === 'linux'
            ? 'LINUX'
            : 'WINDOWS';

    const { data: versions, error } = await supabase
      .from('versions')
      .select('*')
      .eq('platform', currentPlatform)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching latest version:', error);
      this.mainWindow.send('status_message', 'Error checking latest version');
      return null;
    }

    if (versions && versions.length > 0) {
      const latestVersion = versions[0];
      console.log('Latest version for', currentPlatform, ':', latestVersion);
      return latestVersion;
    } else {
      console.log('No versions found for platform:', currentPlatform);
      this.mainWindow.send(
        'status_message',
        'No versions available for your platform',
      );
      return null;
    }
  }

  private async downloadSpecificVersion(versionData: any) {
    try {
      const { version, download_url } = versionData;
      const versionsPath = path.join(process.cwd(), 'versions');
      const versionPath = path.join(versionsPath, version);

      // Create versions directory if it doesn't exist
      if (!fs.existsSync(versionsPath)) {
        fs.mkdirSync(versionsPath, { recursive: true });
      }

      // Create version directory
      if (!fs.existsSync(versionPath)) {
        fs.mkdirSync(versionPath, { recursive: true });
      }

      console.log(`Downloading version ${version} from: ${download_url}`);
      this.mainWindow.send(
        'status_message',
        `Preparing to download version ${version}...`,
      );

      // Check if this is a Google Drive URL
      const isGoogleDrive = download_url.includes('drive.google.com');

      if (isGoogleDrive) {
        // Extract file ID from Google Drive URL
        const fileIdMatch =
          download_url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//) ||
          download_url.match(/[?&]id=([a-zA-Z0-9_-]+)/);

        if (!fileIdMatch) {
          throw new Error('Could not extract file ID from Google Drive URL');
        }

        const fileId = fileIdMatch[1];
        const filename = `ohtanks-${version}.zip`; // Default filename for zip files
        const filePath = path.join(versionPath, filename);

        console.log(`Google Drive file ID: ${fileId}`);
        this.mainWindow.send(
          'status_message',
          `Downloading from Google Drive...`,
        );

        // Use Google Drive specific download method with fallback
        try {
          await this.downloadFromGoogleDrive(fileId, filePath);
        } catch (error) {
          console.log(
            'Primary Google Drive method failed, trying alternative...',
          );
          this.mainWindow.send(
            'status_message',
            'Trying alternative download method...',
          );
          await this.downloadFromGoogleDriveAlternative(fileId, filePath);
        }

        console.log(`Download completed: ${filePath}`);
        this.mainWindow.send(
          'status_message',
          `Version ${version} downloaded successfully!`,
        );

        // Extract the zip file
        try {
          this.mainWindow.send('status_message', `Extracting ${filename}...`);
          await this.extractZipFile(filePath, versionPath);

          // Delete the zip file after successful extraction
          fs.unlinkSync(filePath);
          console.log(`Deleted zip file: ${filePath}`);

          this.mainWindow.send(
            'status_message',
            `Version ${version} extracted successfully!`,
          );
        } catch (extractError) {
          console.error('Error extracting zip file:', extractError);
          this.mainWindow.send(
            'status_message',
            `Error extracting files: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`,
          );
        }
      } else {
        this.mainWindow.send('status_message', `Download url is invalid.`);
      }
    } catch (error) {
      console.error('Error downloading version:', error);
      let errorMessage = 'Unknown error';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle axios errors
        if ('response' in error) {
          const axiosError = error as any;
          if (axiosError.response) {
            errorMessage = `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`;
          } else if (axiosError.request) {
            errorMessage =
              'Network error: Unable to connect to download server';
          } else {
            errorMessage = axiosError.message;
          }
        }
      }

      this.mainWindow.send(
        'status_message',
        `Error downloading version: ${errorMessage}`,
      );
      throw error;
    }
  }

  private launchApplication(version: string) {
    try {
      const versionsPath = path.join(process.cwd(), 'versions');
      const versionPath = path.join(versionsPath, version);

      // Check if version directory exists
      if (!fs.existsSync(versionPath)) {
        console.error(`Version ${version} directory not found: ${versionPath}`);
        this.mainWindow.send(
          'status_message',
          `Version ${version} not found locally`,
        );
        return false;
      }

      // Look for the main executable in the version directory
      const possibleExecutables = [
        'ohtanks.exe', // Windows
        'ohtanks.app', // macOS
        'ohtanks', // Linux
        'OhTanks.exe', // Windows with capital
        'OhTanks.app', // macOS with capital
        'OhTanks', // Linux with capital
      ];

      let executablePath = null;

      // Look for executables
      for (const exe of possibleExecutables) {
        const exePath = path.join(versionPath, exe);
        if (fs.existsSync(exePath)) {
          executablePath = exePath;
          break;
        }
      }

      if (!executablePath) {
        console.error(`No executable found in version ${version} directory`);
        this.mainWindow.send(
          'status_message',
          `No executable found for version ${version}`,
        );
        return false;
      }

      console.log(
        `Launching OhTanks version ${version} from: ${executablePath}`,
      );
      this.mainWindow.send(
        'status_message',
        `Launching OhTanks version ${version}...`,
      );

      // Launch the application
      const child = spawn(executablePath, [], {
        cwd: versionPath,
        detached: true,
        stdio: 'ignore',
      });

      // Unref to allow the parent process to exit
      child.unref();

      console.log(
        `OhTanks version ${version} launched successfully with PID: ${child.pid}`,
      );
      this.mainWindow.send(
        'status_message',
        `OhTanks version ${version} launched successfully!`,
      );

      // Close the launcher after 3 seconds
      setTimeout(() => {
        console.log('Closing launcher...');
        this.mainWindow.send('status_message', 'Closing launcher...');
        this.mainWindow.destroy();
      }, 3000);

      return true;
    } catch (error) {
      console.error('Error launching application:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.mainWindow.send(
        'status_message',
        `Error launching application: ${errorMessage}`,
      );
      return false;
    }
  }

  public async run() {
    const availableVersions = await this.checkAppVersion();
    console.log('Found local versions:', availableVersions);

    const latestVersion = await this.checkLatestVersion();
    if (latestVersion) {
      console.log('Latest remote version:', latestVersion);

      // Check if we have the latest version locally
      const hasLatestVersion = availableVersions.includes(
        latestVersion.version,
      );

      if (!hasLatestVersion) {
        console.log(
          `Latest version ${latestVersion.version} not found locally. Downloading...`,
        );
        this.mainWindow.send(
          'status_message',
          `Downloading version ${latestVersion.version}...`,
        );
        await this.downloadSpecificVersion(latestVersion);
      } else {
        console.log(
          `Latest version ${latestVersion.version} already available locally`,
        );
        this.mainWindow.send(
          'status_message',
          `Using local version ${latestVersion.version}`,
        );
      }

      // Launch the latest version
      this.launchApplication(latestVersion.version);
    } else {
      // If no remote version available, try to launch the latest local version
      if (availableVersions.length > 0) {
        const latestLocalVersion = availableVersions[0]; // Already sorted by version
        console.log(
          `No remote version available, launching latest local version: ${latestLocalVersion}`,
        );
        this.mainWindow.send(
          'status_message',
          `Launching local version ${latestLocalVersion}...`,
        );
        this.launchApplication(latestLocalVersion);
      } else {
        console.log('No versions available locally or remotely');
        this.mainWindow.send(
          'status_message',
          'No versions available. Please check your connection.',
        );
      }
    }
  }
}

export default AppLauncher;
