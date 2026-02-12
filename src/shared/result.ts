export class Result<T> {
  public isSuccess: boolean;
  public isFailure: boolean;
  public error?: string;
  private _value?: T;

  private constructor(isSuccess: boolean, error?: string, value?: T) {
    if (isSuccess && error) {
      throw new Error(`InvalidOperation: A result cannot be 
          successful and contain an error`);
    }
    if (!isSuccess && !error) {
      throw new Error(`InvalidOperation: A failing result 
          needs to contain an error message`);
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error || undefined;
    this._value = value || undefined;

    Object.freeze(this);
  }

  public getValue(): T | undefined {
    if (!this.isSuccess) {
      return undefined;
    }

    return this._value;
  }

  public getValueOrNull(): T | null {
    if (!this.isSuccess) {
      return null;
    }
    return this._value || null;
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, undefined, value);
  }

  public static fail<U>(error: string): Result<U> {
    return new Result<U>(false, error);
  }

  public static combine<T>(results: Result<T>[]): Result<T> {
    for (const result of results) {
      if (result.isFailure) return result;
    }
    return Result.ok<T>();
  }
}
