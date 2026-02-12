import { Result } from "./result";

describe("Result Shared Class", () => {
  it("deve criar um resultado de sucesso com valor", () => {
    const value = { data: "teste" };
    const result = Result.ok(value);

    expect(result.isSuccess).toBe(true);
    expect(result.isFailure).toBe(false);
    expect(result.getValue()).toEqual(value);
    expect(result.error).toBeUndefined();
  });

  it("deve criar um resultado de sucesso sem valor (void)", () => {
    const result = Result.ok();

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBeUndefined();
  });

  it("deve criar um resultado de falha com mensagem de erro", () => {
    const errorMsg = "Algo deu errado";
    const result = Result.fail(errorMsg);

    expect(result.isSuccess).toBe(false);
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(errorMsg);
    expect(result.getValue()).toBeUndefined();
  });

  it("getValueOrNull deve retornar null em caso de falha", () => {
    const result = Result.fail("Erro");
    expect(result.getValueOrNull()).toBeNull();
  });

  it("getValueOrNull deve retornar valor em caso de sucesso", () => {
    const result = Result.ok("Valor");
    expect(result.getValueOrNull()).toBe("Valor");
  });

  it("combine deve retornar sucesso se todos os resultados forem sucesso", () => {
    const results = [Result.ok(), Result.ok("teste"), Result.ok(123)];

    const combined = Result.combine(results);
    expect(combined.isSuccess).toBe(true);
  });

  it("combine deve retornar a primeira falha encontrada na lista", () => {
    const results = [Result.ok(), Result.fail("Erro 1"), Result.fail("Erro 2")];

    const combined = Result.combine(results);

    expect(combined.isFailure).toBe(true);
    expect(combined.error).toBe("Erro 1");
  });
});
