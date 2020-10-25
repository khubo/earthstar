import {
    AuthorAddress,
    AuthorKeypair,
    DocToSet,
    Document,
    ValidationError,
    WorkspaceAddress,
    WriteEvent,
    WriteResult,
} from '../util/types';
import { Emitter } from '../util/emitter';
import { QueryOpts2 } from './query2';

//================================================================================

export interface IStorage2 {
    workspace : WorkspaceAddress;
    onWrite : Emitter<WriteEvent>;
    onChange : Emitter<undefined>;  // deprecated
    _now: number | null;  // used for testing time behavior.  is used instead of Date.now().  normally null.

    // constructor takes: a driver, a list of validators, and a workspace

    // GET DATA OUT
    authors(): AuthorAddress[];
    paths(query?: QueryOpts2): string[];
    documents(query?: QueryOpts2): Document[];
    contents(query?: QueryOpts2): string[];
    // TODO: rename from "get" to "latest"
    getDocument(path: string): Document | undefined;
    getContent(path: string): string | undefined;
    // PUT DATA IN
    ingestDocument(doc: Document, isLocal: boolean): WriteResult | ValidationError;
    set(keypair: AuthorKeypair, docToSet: DocToSet): WriteResult | ValidationError;
    // CLOSE
    // removeExpiredDocs()?
    close(): void;
    isClosed(): boolean;
}

export interface IStorageDriver {
    // driver is responsible for actually saving, loading, querying documents
    // driver is responsible for freezing documents
    // driver is responsible for not returning expired documents.
    //   must delete all expired docs in at least 1 of these 3 circumstances:
    //      with a setInterval that it manages, running at least every 60 minutes
    //      on begin()
    //      on close()
    //   optionally, can also delete them when encountering them in a query.
    // driver does no validation
    // driver does not check if what's being stored is reasonable
    // driver doesn't make any decisions, that's MegaStorage's job
    begin(megaStorage: IStorage2, workspace: WorkspaceAddress): void;

    setConfig(key: string, content: string): void;
    getConfig(key: string): string | undefined;
    deleteConfig(key: string): void;
    clearConfig(): void;  // delete all

    authors(now: number): AuthorAddress[];  // this includes "deleted" docs with content: '', but ignores expired docs
    pathQuery(query: QueryOpts2, now: number): string[];
    documentQuery(query: QueryOpts2, now: number): Document[];
    upsertDocument(doc: Document): void;  // overwrite existing doc no matter what
    removeExpiredDocuments(now: number): void;
    close(): void;
}
