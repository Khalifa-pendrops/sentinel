interface SentinelEventRow {
  id: string;
  organizationId: string;
  sourceType: string;
  actionType: string;
  outcomeStatus: string;
  confidence: number;
  timestamp: string;
}

interface EventsResponse {
  events: SentinelEventRow[];
  nextCursor: string | null;
}

async function fetchEvents(): Promise<EventsResponse | null> {
  const apiUrl = process.env['SENTINEL_API_URL'] ?? 'http://localhost:8081';
  const apiKey = process.env['SENTINEL_API_KEY'];

  if (apiKey === undefined) {
    return null;
  }

  try {
    const response = await fetch(apiUrl + '/v1/events', {
      headers: { 'x-sentinel-api-key': apiKey },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as EventsResponse;
  } catch {
    return null;
  }
}

export default async function EventExplorerPage(): Promise<React.JSX.Element> {
  const data = await fetchEvents();

  if (data === null) {
    return <p>Unable to load events. Check SENTINEL_API_URL and SENTINEL_API_KEY are set, and apps/api is running.</p>;
  }

  if (data.events.length === 0) {
    return <p>No events yet.</p>;
  }

  return (
    <main style={{ padding: '24px' }}>
      <h1>Event Explorer</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Source</th>
            <th>Action</th>
            <th>Outcome</th>
            <th>Confidence</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {data.events.map((event) => (
            <tr key={event.id}>
              <td>{event.id}</td>
              <td>{event.sourceType}</td>
              <td>{event.actionType}</td>
              <td>{event.outcomeStatus}</td>
              <td>{event.confidence}</td>
              <td>{event.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
