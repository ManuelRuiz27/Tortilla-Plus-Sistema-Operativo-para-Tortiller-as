const taxRegimes = [
  { code: "601", label: "General de Ley Personas Morales" },
  { code: "603", label: "Personas Morales con Fines no Lucrativos" },
  { code: "605", label: "Sueldos y Salarios e Ingresos Asimilados a Salarios" },
  { code: "606", label: "Arrendamiento" },
  { code: "607", label: "Regimen de Enajenacion o Adquisicion de Bienes" },
  { code: "608", label: "Demas ingresos" },
  { code: "610", label: "Residentes en el Extranjero sin Establecimiento Permanente en Mexico" },
  { code: "611", label: "Ingresos por Dividendos" },
  { code: "612", label: "Personas Fisicas con Actividades Empresariales y Profesionales" },
  { code: "614", label: "Ingresos por intereses" },
  { code: "615", label: "Regimen de los ingresos por obtencion de premios" },
  { code: "616", label: "Sin obligaciones fiscales" },
  { code: "621", label: "Incorporacion Fiscal" },
  { code: "625", label: "Regimen de las Actividades Empresariales con ingresos a traves de Plataformas Tecnologicas" },
  { code: "626", label: "Regimen Simplificado de Confianza" },
];

const cfdiUses = [
  { code: "G01", label: "Adquisicion de mercancias" },
  { code: "G03", label: "Gastos en general" },
  { code: "I01", label: "Construcciones" },
  { code: "I02", label: "Mobiliario y equipo de oficina por inversiones" },
  { code: "I03", label: "Equipo de transporte" },
  { code: "D01", label: "Honorarios medicos, dentales y gastos hospitalarios" },
  { code: "D02", label: "Gastos medicos por incapacidad o discapacidad" },
  { code: "D03", label: "Gastos funerales" },
  { code: "D04", label: "Donativos" },
  { code: "D10", label: "Pagos por servicios educativos" },
  { code: "CP01", label: "Pagos" },
  { code: "S01", label: "Sin efectos fiscales" },
];

export function getPublicBillingCatalogs() {
  return {
    data: {
      taxRegimes,
      cfdiUses,
      defaults: {
        taxRegime: "616",
        cfdiUse: "S01",
      },
    },
  };
}

export function isValidTaxRegime(code: string) {
  return taxRegimes.some((item) => item.code === code);
}

export function isValidCfdiUse(code: string) {
  return cfdiUses.some((item) => item.code === code);
}
