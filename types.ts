export interface ResponseInfo {
  headers: {
    [k: string]: string
  }
  status: number
  statusText: string
}
