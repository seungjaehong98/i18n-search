import { IndexManager } from "../indexer/IndexManager";
import { SearchResult } from "../indexer/types";

export class SearchEngine {
  constructor(private indexManager: IndexManager) {}

  searchByValue(query: string): SearchResult[] {
    return this.indexManager.searchByValue(query);
  }

  searchByKey(query: string): SearchResult[] {
    return this.indexManager.searchByKey(query);
  }
}
