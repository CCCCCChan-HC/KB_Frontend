declare module 'node-cas' {
    interface CASOptions {
        cas_url: string;
        service_url: string;
        cas_version?: '1.0' | '2.0' | '3.0';
        renew?: boolean;
        session_name?: string;
    }

    class CAS {
        constructor(options: CASOptions);
        cas_version: string;
        cas_url: string;
        service_url: string;
        session_name: string;
        renew: boolean;
        _validateUri: string;
        _validate(body: string, callback: (err: Error | null, user?: string) => void): void;
        authenticate(req: any, res: any, callback: (err: Error | null, user?: string) => void): void;
        logout(req: any, res: any): void;
        getUser(): string | null;
    }

    export = CAS;
}
