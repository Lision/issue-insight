export const ISSUES_QUERY = `#graphql
query FetchIssues(
  $owner: String!
  $name: String!
  $states: [IssueState!]
  $labels: [String!]
  $since: DateTime
  $cursor: String
) {
  repository(owner: $owner, name: $name) {
    issues(
      first: 100
      after: $cursor
      states: $states
      labels: $labels
      filterBy: { since: $since }
      orderBy: { field: COMMENTS, direction: DESC }
    ) {
      nodes {
        number
        title
        body
        createdAt
        updatedAt
        state
        url
        author { login }
        labels(first: 20) { nodes { name } }
        reactions { totalCount }
        comments(first: 10) {
          totalCount
          nodes {
            body
            author { login }
            reactions { totalCount }
            createdAt
          }
        }
        milestone { title }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
`;
