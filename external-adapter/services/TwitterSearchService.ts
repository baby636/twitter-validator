import config from '../config';
import { IRestResponse, RestClient } from 'typed-rest-client/RestClient';
import {
  IHttpClient,
  IHttpClientResponse,
  IRequestHandler,
  IRequestInfo,
} from 'typed-rest-client/Interfaces';
import { Base64 } from 'js-base64';
import * as _ from 'lodash';
import { RequestOptions } from 'http';
import qs from 'qs';

export type Tweet = {
  text: string;
  user: {
    screen_name: string;
  };
};

export type SearchQuery = {
  hashtag: string;
  text?: string;
};

type TweetsResult = {
  statuses: Tweet[];
  search_metadata: {
    next_results: string;
    count: number;
  };
};

export class InvalidTwitterHashtagError extends Error {}

export class TooMuchTweetsInResponseError extends Error {}

export class AuthenticationError extends Error {}

export default class TwitterSearchService {
  private readonly invalidHashtagDetector: RegExp = /[^\w]/;
  private readonly searchRequestsAllowed = 5;

  constructor(
    private readonly tweetsPerRequest = 100,
    private readonly client: RestClient = new RestClient(
      null,
      `${config.TWITTER.API_URL}`,
      [
        new TwitterAuthenticationHandler(
          config.TWITTER.API_URL,
          config.TWITTER.API_KEY,
          config.TWITTER.API_SECRET,
        ),
      ],
    ),
  ) {}

  async searchTweets(searchQuery: SearchQuery): Promise<Tweet[]> {
    this.validateHashtag(searchQuery.hashtag);
    let tweetMaxId = '';
    const tweets: Tweet[] = [];
    for (
      let requestsMade = 1;
      requestsMade <= this.searchRequestsAllowed;
      requestsMade++
    ) {
      const response = await this.makeSearchRequest(searchQuery, tweetMaxId);
      if (response.result === null) {
        return [];
      }
      tweets.push(...response.result.statuses);
      if (this.isLastPage(response)) {
        return tweets;
      }
      tweetMaxId = this.getNextTweetMaxId(response);
    }

    throw new TooMuchTweetsInResponseError(
      `Can't receive all tweets by #${searchQuery.hashtag} ${
        searchQuery.text
      }. More than ${
        this.tweetsPerRequest * this.searchRequestsAllowed
      } tweets found.`,
    );
  }

  private async makeSearchRequest(
    searchQuery: SearchQuery,
    tweetMaxId: string,
  ): Promise<IRestResponse<TweetsResult>> {
    const text = searchQuery.text ?? '';
    return await this.client.get<TweetsResult>(
      `/${config.TWITTER.API_VERSION}/search/tweets.json`,
      {
        queryParameters: {
          params: {
            q: `#${searchQuery.hashtag} ${text} -filter:retweets`,
            result_type: 'recent',
            include_entities: 'false',
            count: this.tweetsPerRequest,
            max_id: tweetMaxId,
          },
        },
      },
    );
  }

  private getNextTweetMaxId(response: IRestResponse<TweetsResult>): string {
    const nextResultsQuery = qs.parse(
      response.result!.search_metadata.next_results,
      { ignoreQueryPrefix: true },
    );
    return (nextResultsQuery.max_id as string) || '';
  }

  private isLastPage(response: IRestResponse<TweetsResult>): boolean {
    return response.result!.statuses.length < this.tweetsPerRequest;
  }

  private validateHashtag(hashtag: string): void {
    if (this.invalidHashtagDetector.test(hashtag)) {
      throw new InvalidTwitterHashtagError('Invalid twitter hashtag provided');
    }
  }
}

class TwitterAuthenticationHandler implements IRequestHandler {
  private readonly oauthPath = '/oauth2/token';
  private accessToken: string;

  constructor(
    private readonly apiUrl: string,
    private readonly apiKey: string,
    private readonly apiSecret: string,
  ) {}

  prepareRequest(options: RequestOptions): void {
    if (options.path !== this.oauthPath) {
      _.set(options, 'headers.Authorization', `Bearer ${this.accessToken}`);
    }
  }

  canHandleAuthentication(): boolean {
    return true;
  }

  async handleAuthentication(
    httpClient: IHttpClient,
    requestInfo: IRequestInfo,
    objs: string,
  ): Promise<IHttpClientResponse> {
    this.accessToken = await this.requestAccessToken(httpClient);
    const authenticatedRequestInfo = requestInfo;
    _.set(
      authenticatedRequestInfo.options,
      'headers.Authorization',
      `Bearer ${this.accessToken}`,
    );
    return httpClient.requestRaw(authenticatedRequestInfo, objs);
  }

  private async requestAccessToken(httpClient: IHttpClient): Promise<string> {
    const encodedCredentials = Base64.encode(
      `${encodeURIComponent(this.apiKey)}:${encodeURIComponent(
        this.apiSecret,
      )}`,
    );
    const tokenResponse = await httpClient.post(
      `${this.apiUrl}${this.oauthPath}`,
      'grant_type=client_credentials',
      {
        Authorization: `Basic ${encodedCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
    );
    if (tokenResponse.message.statusCode !== 200) {
      throw new AuthenticationError(await tokenResponse.readBody());
    }
    const tokenJson = JSON.parse(await tokenResponse.readBody());
    return tokenJson.access_token;
  }
}
