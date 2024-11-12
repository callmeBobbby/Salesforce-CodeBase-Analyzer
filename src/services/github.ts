import { Octokit } from '@octokit/rest';
import type { Repository, SalesforceFile } from '../types';

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getSalesforceRepos(): Promise<Repository[]> {
    const { data } = await this.octokit.repos.listForAuthenticatedUser();
    
    const salesforceRepos = await Promise.all(
      data.map(async (repo) => {
        const files = await this.getRepoFiles(repo.owner.login, repo.name);
        const hasApex = files.some(file => file.endsWith('.cls') || file.endsWith('.trigger'));
        const hasLWC = files.some(file => file.includes('/lwc/'));
        
        if (hasApex || hasLWC) {
          return {
            id: repo.id.toString(),
            name: repo.name,
            description: repo.description || '',
            stars: repo.stargazers_count,
            language: repo.language || 'Unknown',
            lastUpdated: new Date(repo.updated_at).toLocaleDateString(),
            hasApex,
            hasLWC,
          };
        }
        return null;
      })
    );

    return salesforceRepos.filter((repo): repo is Repository => repo !== null);
  }

  private async getRepoFiles(owner: string, repo: string): Promise<string[]> {
    const { data } = await this.octokit.git.getTree(owner, repo, {
      recursive: true,
    });
    return data.tree.map(file => file.path);
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<SalesforceFile> {
    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
    });

    if ('content' in data) {
      const content = Buffer.from(data.content, 'base64').toString();
      const type = this.getFileType(path);
      
      return {
        name: path.split('/').pop() || '',
        path,
        type,
        content,
      };
    }
    
    throw new Error('Not a file');
  }

  private getFileType(path: string): SalesforceFile['type'] {
    if (path.endsWith('.cls') || path.endsWith('.trigger')) return 'apex';
    if (path.includes('/lwc/')) return 'lwc';
    if (path.includes('/aura/')) return 'aura';
    return 'other';
  }
}