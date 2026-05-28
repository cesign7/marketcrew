export type SearchAdMediaDisplayInfo = {
  mediaName: string;
  mediaUrl?: string;
  pcMedia: boolean | null;
  mobileMedia: boolean | null;
  searchAdNetwork: boolean | null;
  contentsAdNetwork: boolean | null;
};

const SEARCH_AD_MEDIA_FALLBACKS: Record<string, SearchAdMediaDisplayInfo> = {
  "612593": {
    mediaName: "다음-PC",
    mediaUrl: "https://www.daum.net/",
    pcMedia: true,
    mobileMedia: false,
    searchAdNetwork: true,
    contentsAdNetwork: false,
  },
  "612594": {
    mediaName: "다음-모바일",
    mediaUrl: "https://m.daum.net/",
    pcMedia: false,
    mobileMedia: true,
    searchAdNetwork: true,
    contentsAdNetwork: true,
  },
  "684924": {
    mediaName: "네이버 통합검색 네이버플러스 스토어 - 모바일",
    mediaUrl: "http://m.search.naver.com/search.naver/",
    pcMedia: false,
    mobileMedia: true,
    searchAdNetwork: true,
    contentsAdNetwork: false,
  },
  "684925": {
    mediaName: "네이버 통합검색 네이버플러스 스토어 - PC",
    mediaUrl: "http://search.naver.com/search.naver/",
    pcMedia: true,
    mobileMedia: false,
    searchAdNetwork: true,
    contentsAdNetwork: false,
  },
  "684927": {
    mediaName: "네이버플러스 스토어 - PC",
    mediaUrl: "https://search.shopping.naver.com/ns/search/",
    pcMedia: true,
    mobileMedia: false,
    searchAdNetwork: true,
    contentsAdNetwork: false,
  },
  "805760": {
    mediaName: "네이트검색-모바일",
    mediaUrl: "https://m.search.daum.net/nate",
    pcMedia: false,
    mobileMedia: true,
    searchAdNetwork: true,
    contentsAdNetwork: false,
  },
};

export function getSearchAdMediaFallback(mediaId: string | undefined) {
  return mediaId ? SEARCH_AD_MEDIA_FALLBACKS[mediaId] : undefined;
}

export function listSearchAdMediaFallbackIds() {
  return Object.keys(SEARCH_AD_MEDIA_FALLBACKS);
}

export function getSearchAdMediaNetworkLabel(media: Pick<SearchAdMediaDisplayInfo, "searchAdNetwork" | "contentsAdNetwork"> | undefined) {
  if (!media) {
    return null;
  }

  if (media.searchAdNetwork && media.contentsAdNetwork) {
    return "검색/콘텐츠 네트워크";
  }
  if (media.searchAdNetwork) {
    return "검색 네트워크";
  }
  if (media.contentsAdNetwork) {
    return "콘텐츠 네트워크";
  }
  return null;
}
