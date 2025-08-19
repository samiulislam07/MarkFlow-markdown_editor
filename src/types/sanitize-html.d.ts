declare module 'sanitize-html' {
  interface IOptions {
    allowedTags?: string[];
    allowedAttributes?: { [key: string]: string[] };
    allowedIframeHostnames?: string[];
    allowedSchemes?: string[];
  }

  function sanitize(dirty: string, options?: IOptions): string;
  export default sanitize;
}