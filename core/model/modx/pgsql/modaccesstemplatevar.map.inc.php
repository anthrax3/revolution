<?php
/**
 * @package modx
 * @subpackage pgsql
 */
$xpdo_meta_map['modAccessTemplateVar']= array (
  'package' => 'modx',
  'version' => '1.1',
  'table' => 'access_templatevars',
  'extends' => 'modAccessElement',
  'fields' => 
  array (
  ),
  'fieldMeta' => 
  array (
  ),
  'aggregates' => 
  array (
    'Target' => 
    array (
      'class' => 'modTemplateVar',
      'local' => 'target',
      'foreign' => 'id',
      'owner' => 'foreign',
      'cardinality' => 'one',
    ),
  ),
);