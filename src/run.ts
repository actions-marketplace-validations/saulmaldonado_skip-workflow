import { debug, getInput, setFailed, setOutput } from '@actions/core';
import { getOctokit } from '@actions/github';
import { Context } from '@actions/github/lib/context';
import { config } from './config';
import { Commit } from './lib/getCommits';
import {
  createOutputFoundLog,
  createOutputNotFoundLog,
} from './lib/helpers/createOuputLog';
import { parseSearchInput } from './lib/parseSearchInput';
import { searchInCommits } from './searchInCommits';
import { searchInPullRequest } from './searchInPullRequest';

export type SearchResults = {
  commitMessagesSearchResult?: boolean;
  commit?: Commit;
  titleSearchResult?: boolean;
};

const {
  GITHUB_TOKEN_INPUT_ID,
  PHRASE_INPUT_ID,
  MATCH_FOUND_OUTPUT_ID,
  SEARCH_INPUT_ID,
  SEARCH_OPTIONS: { COMMIT_MESSAGES, PULL_REQUEST },
} = config;

type Run = () => Promise<void>;
const run: Run = async () => {
  try {
    const context = new Context();

    const githubToken: string = getInput(GITHUB_TOKEN_INPUT_ID, {
      required: true,
    });
    debug(`${GITHUB_TOKEN_INPUT_ID} input: ${githubToken}`);

    const phrase: string = getInput(PHRASE_INPUT_ID, { required: true });
    debug(`${PHRASE_INPUT_ID} input: ${phrase}`);

    const searchInput = getInput(SEARCH_INPUT_ID, { required: true });
    debug(`${SEARCH_INPUT_ID} input: ${searchInput}`);

    const searchOptions = parseSearchInput(searchInput);
    debug(`options: ${[...searchOptions].toString()}`);

    const octokit = getOctokit(githubToken);

    const searchResults: SearchResults = {};

    if (searchOptions.has(COMMIT_MESSAGES)) {
      const {
        result: commitMessagesSearchResult,
        commit,
      } = await searchInCommits({
        octokit,
        context,
        phrase,
      });

      searchResults.commitMessagesSearchResult = commitMessagesSearchResult;
      searchResults.commit = commit;
    }

    if (searchOptions.has(PULL_REQUEST)) {
      const { result: titleSearchResult } = await searchInPullRequest({
        context,
        octokit,
        phrase,
      });

      searchResults.titleSearchResult = titleSearchResult;
    }

    const {
      commit,
      commitMessagesSearchResult,
      titleSearchResult,
    } = searchResults;

    if (commitMessagesSearchResult || titleSearchResult) {
      console.log(
        createOutputFoundLog({
          commitMessagesSearchResult,
          titleSearchResult,
          phrase,
        }),
      );

      setOutput(MATCH_FOUND_OUTPUT_ID, true);
    } else {
      console.log(
        createOutputNotFoundLog({
          commitMessagesSearchResult,
          titleSearchResult,
          commit,
          phrase,
        }),
      );

      setOutput(MATCH_FOUND_OUTPUT_ID, null);
    }
  } catch (error) {
    debug(error.stack ?? 'No error stack trace');

    error.message = `❌ ${error.message}`;

    setFailed(error);
  }
};

export default run;
