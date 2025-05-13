// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import FitFileParser from "https://esm.sh/fit-file-parser";

console.log("Edge Function 'parse-fit-file' is running.");

Deno.serve(async (req: Request) => {
  try {
    // In un trigger di storage, req.json() conterrà i dettagli dell'evento di storage
    // Ad esempio: { type: 'INSERT', table: 'objects', schema: 'storage', record: { bucket_id: 'fit-files', name: 'path/to/file.fit', ... } }
    const eventData = await req.json();
    console.log("Received event data:", JSON.stringify(eventData, null, 2));

    // PER ORA, SIMULIAMO DI AVERE IL CONTENUTO DEL FILE FIT
    // In un secondo momento, recupereremo il file da Supabase Storage usando eventData.record.name (il percorso del file)
    // e eventData.record.bucket_id

    // Esempio di come potresti creare un oggetto FitFileParser
    // const fitFileParser = new FitFileParser(CONTENT_OF_THE_FIT_FILE_AS_ARRAY_BUFFER);
    
    // Esempio di come potresti parsare il file
    // const parsedData = fitFileParser.parse();

    // console.log("Parsed FIT file data (esempio):", JSON.stringify(parsedData, null, 2));

    const responseData = {
      message: "Event received by parse-fit-file. FIT parsing logic to be implemented.",
      eventRecord: eventData.record // Restituiamo parte dei dati dell'evento per conferma
    };

    return new Response(
      JSON.stringify(responseData),
      { headers: { "Content-Type": "application/json", "Connection": "keep-alive" } },
    );
  } catch (err) { // err è di tipo unknown
    let errorMessage = "Si è verificato un errore sconosciuto durante l'elaborazione della funzione.";
    let errorStack = undefined;
    if (err instanceof Error) {
      errorMessage = err.message;
      errorStack = err.stack;
    } else if (typeof err === 'string') {
      errorMessage = err;
    }
    // Log dell'errore completo se possibile
    console.error("Error in parse-fit-file function:", err); 
    console.error("Processed error message:", errorMessage, "Stack:", errorStack);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

/* To invoke locally (simulando un evento di storage):

  1. Run `supabase start`
  2. Make an HTTP request (modifica il payload per simulare un evento di storage):

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/parse-fit-file' \
    --header 'Authorization: Bearer SUPABASE_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{
      "type": "INSERT",
      "table": "objects",
      "schema": "storage",
      "record": {
        "id": "some-uuid",
        "bucket_id": "fit-files",
        "name": "c02f04b8-6a52-491b-8a0b-c61b891b53df/9d416d10-7cf4-4acb-ae4f-75ea01964838/1678886400000_example.fit",
        "owner": "some-owner-uuid",
        "created_at": "2023-01-01T12:00:00.000Z",
        "updated_at": "2023-01-01T12:00:00.000Z",
        "last_accessed_at": "2023-01-01T12:00:00.000Z",
        "metadata": {}
      },
      "old_record": null
    }'

  NOTA: Sostituisci SUPABASE_ANON_KEY con la tua anon key effettiva se hai JWT abilitato per le funzioni.
       Per i trigger di storage, l'autenticazione è gestita diversamente (tramite il ruolo di servizio).
*/
