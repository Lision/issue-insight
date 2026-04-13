export interface RawIssue {
  number: number;
  title: string;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  state: "OPEN" | "CLOSED";
  url: string;
  author: { login: string } | null;
  labels: { nodes: { name: string }[] };
  reactions: { totalCount: number };
  comments: {
    totalCount: number;
    nodes: RawComment[];
  };
  milestone: { title: string } | null;
}

export interface RawComment {
  body: string;
  author: { login: string } | null;
  reactions: { totalCount: number };
  createdAt: string;
}
