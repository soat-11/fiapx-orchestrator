import { AllExceptionsFilter } from "./all-exception.filter";
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

const mockJson = jest.fn();
const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
const mockResponse = {
  status: mockStatus,
} as unknown as Response;

// Mock do objeto Request
const mockRequest = {
  url: "/test-url",
} as unknown as Request;

// Mock do ArgumentsHost do NestJS
const mockArgumentsHost = {
  switchToHttp: jest.fn().mockReturnValue({
    getResponse: () => mockResponse,
    getRequest: () => mockRequest,
  }),
} as unknown as ArgumentsHost;

describe("AllExceptionsFilter", () => {
  let filter: AllExceptionsFilter;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new AllExceptionsFilter();

    loggerErrorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("deve capturar HttpException (ex: 400 Bad Request) e logar WARN", () => {
    const exception = new HttpException(
      "Erro de Validação",
      HttpStatus.BAD_REQUEST
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        path: "/test-url",
        error: "Erro de Validação",
      })
    );

    expect(loggerWarnSpy).toHaveBeenCalled();
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it("deve capturar Erro Genérico (ex: Crash) e retornar 500 e logar ERROR", () => {
    const exception = new Error("Falha no banco de dados");

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: "Internal Server Error",
      })
    );

    expect(loggerErrorSpy).toHaveBeenCalled();
  });
});
