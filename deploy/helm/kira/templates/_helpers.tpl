{{/*
Chart name.
*/}}
{{- define "kira.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Fully qualified app name.
*/}}
{{- define "kira.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Chart label.
*/}}
{{- define "kira.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "kira.labels" -}}
helm.sh/chart: {{ include "kira.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/part-of: {{ include "kira.name" . }}
{{- end }}

{{/*
Selector labels for a specific component.
Usage: {{ include "kira.selectorLabels" (dict "component" "api" "root" .) }}
*/}}
{{- define "kira.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kira.name" .root }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
Component labels (common + selector).
Usage: {{ include "kira.componentLabels" (dict "component" "api" "root" .) }}
*/}}
{{- define "kira.componentLabels" -}}
{{ include "kira.labels" .root }}
{{ include "kira.selectorLabels" (dict "component" .component "root" .root) }}
{{- end }}

{{/*
Database URL constructed from postgres credentials.
*/}}
{{- define "kira.databaseUrl" -}}
postgresql://{{ .Values.postgres.credentials.user }}:{{ .Values.postgres.credentials.password }}@postgres:5432/{{ .Values.postgres.credentials.database }}
{{- end }}
