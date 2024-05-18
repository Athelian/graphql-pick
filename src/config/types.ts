export interface Options {
  /**
   * Ignore pattern for resolving type unions. You must
   * ensure that, for cases where your pattern is a hit with a union,
   * that it matches `(unionMembers.length) - 1` elements. This is 
   * to ensure that the utility can unambiguously resolve the final `1`.
   */
  noResolve?: string[];
}
