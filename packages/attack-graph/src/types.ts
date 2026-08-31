export type GraphNodeType = 'detection' | 'actor' | 'resource';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  evidence: string;
}

export interface AttackGraph {
  incidentId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
